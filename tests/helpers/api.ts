const API_BASE = 'http://localhost:4000';

async function request(method: string, path: string, token?: string, body?: unknown) {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (body !== undefined && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });

  let responseBody: unknown;
  const contentType = res.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    responseBody = await res.json();
  } else {
    responseBody = await res.text();
  }

  return { status: res.status, body: responseBody };
}

export async function get(path: string, token?: string) {
  return request('GET', path, token);
}

export async function post(path: string, body?: unknown, token?: string) {
  return request('POST', path, token, body);
}

export async function patch(path: string, body?: unknown, token?: string) {
  return request('PATCH', path, token, body);
}

export async function del(path: string, token?: string) {
  return request('DELETE', path, token);
}

export async function pollWorkflowStatus(
  workflowId: string,
  targetStatus: string,
  token: string,
  timeoutMs = 30_000,
): Promise<unknown> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { status, body } = await get(`/api/workflows/${workflowId}`, token);
    if (status !== 200) throw new Error(`Poll failed with status ${status}`);

    const data = body as { status: string };
    if (data.status === targetStatus) return data;
    if (data.status === 'failed') throw new Error(`Workflow reached failed status while polling for ${targetStatus}`);

    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timeout polling workflow ${workflowId} for status ${targetStatus}`);
}
