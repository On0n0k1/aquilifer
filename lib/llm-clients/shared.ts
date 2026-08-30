export interface ChatResult {
  text: string;
}

export async function describeError(response: Response): Promise<string> {
  const body = await response.text().catch(() => '');
  return `provider_error_${response.status}${body ? `: ${body.slice(0, 200)}` : ''}`;
}
