import { WorkItem } from './index';

export interface WorkItemParser {
    /**
     * Detects if the current page URL is supported by this parser.
     */
    canParse(url: string): boolean;

    /**
     * Parses the current DOM to extract a standard WorkItem.
     * Throws parsing error if critical fields are missing.
     */
    parse(document: Document, url: string): Promise<WorkItem>;
}
