export type ActionSuccess<T> = { success: true; data: T };

export type ActionFailure = {
  success: false;
  error: string;
  code?: string;
};

export type ActionResult<T> = ActionSuccess<T> | ActionFailure;

export function actionError(error: unknown, fallback: string): ActionFailure {
  if (error instanceof Error && error.message) {
    return { success: false, error: error.message };
  }
  return { success: false, error: fallback };
}
