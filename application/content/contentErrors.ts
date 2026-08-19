export type ContentErrorCode =
  | 'notConfigured'
  | 'networkUnavailable'
  | 'invalidRemoteSnapshot'
  | 'invalidCachedSnapshot'
  | 'contentUnavailable';

export interface ContentError {
  code: ContentErrorCode;
  /** Internal/diagnostic only. Never render this to a child — see contentUnavailable. */
  message: string;
}

export function contentError(code: ContentErrorCode, message: string): ContentError {
  return { code, message };
}
