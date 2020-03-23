/**
 * Editor.js Saver
 *
 * @module Saver
 * @author Codex Team
 * @version 2.0.0
 */
import Module from '../__module';
import {OutputData} from '../../../types';
import {SavedData, ValidatedData} from '../../types-internal/block-data';
import Block from '../block';
import * as _ from '../utils';

declare const VERSION: string;

/**
 * @classdesc This method reduces all Blocks asyncronically and calls Block's save method to extract data
 *
 * @typedef {Saver} Saver
 * @property {Element} html - Editor HTML content
 * @property {String} json - Editor JSON output
 */
export default class Saver extends Module {
  /**
   * Composes new chain of Promises to fire them alternatelly
   * @return {OutputData}
   */
  public async save(): Promise<OutputData> {
    const {BlockManager, Sanitizer, ModificationsObserver} = this.Editor;
    const blocks = BlockManager.blocks,
      chainData = [];

    /**
     * Disable modifications observe while saving
     */
    ModificationsObserver.disable();

    blocks.forEach((block: Block) => {
     chainData.push(this.getSavedData(block));
    });

    const extractedData = await Promise.all(chainData);
    const sanitizedData = await Sanitizer.sanitizeBlocks(extractedData);

    ModificationsObserver.enable();

    return this.makeOutput(sanitizedData);
  }

  /**
   * Saves and validates
   * @param {Block} block - Editor's Tool
   * @return {ValidatedData} - Tool's validated data
   */
  private async getSavedData(block: Block): Promise<ValidatedData> {
      const blockData = await block.save();
      const isValid = blockData && await block.validate(blockData.data);

      return {...blockData, isValid};
  }

  /**
   * Creates output object with saved data, time and version of editor
   * @param {ValidatedData} allExtractedData
   * @return {OutputData}
   */
  private makeOutput(allExtractedData): OutputData {
    let totalTime = 0;
    const blocks = [];

    _.log('[Editor.js saving]:', 'groupCollapsed');

    allExtractedData.forEach(({tool, data, time, isValid, tunes}) => {
      totalTime += time;

      /**
       * Capitalize Tool name
       */
      _.log(`${tool.charAt(0).toUpperCase() + tool.slice(1)}`, 'group');

      if (isValid) {
        /** Group process info */
        _.log(data);
        _.log(undefined, 'groupEnd');
      } else {
        _.log(`Block «${tool}» skipped because saved data is invalid`);
        _.log(undefined, 'groupEnd');
        return;
      }

      /** If it was stub Block, get original data */
      if (tool === this.Editor.Tools.stubTool) {
        blocks.push(data);
        return;
      }

      const savedData: any = {
        type: tool,
        data,
      };

      console.log(Object.keys(tunes).length);

      if (Object.keys(tunes).length) {
        savedData.tunes = tunes;
      }

      blocks.push(savedData);
    });

    _.log('Total', 'log', totalTime);
    _.log(undefined, 'groupEnd');

    return {
      time: +new Date(),
      blocks,
      version: VERSION,
    };
  }
}
