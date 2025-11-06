import { describe, test, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import TestForm from '../src/components/TestForm';

// Mock API responses
const mockSuccessResponse = {
  ok: true,
  status: 200,
  samplePath: '$.orders',
  fields: [
    { name: 'order_id', type: 'integer', sample: 1 },
    { name: 'customer_name', type: 'string', sample: 'John Doe' },
    { name: 'amount', type: 'number', sample: 150.50 }
  ],
  pagination: {
    type: 'page',
    pageParam: 'page',
    limitParam: 'limit'
  }
};

const mockErrorResponse = {
  ok: false,
  status: 401,
  message: 'HTTP 401: Unauthorized',
  hints: 'Authentication failed. Check if your API key or token is correct.'
};

// Set up MSW server
const server = setupServer(
  http.post('/api/test', () => {
    return HttpResponse.json(mockSuccessResponse);
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('TestForm', () => {
  test('renders form with URL input and Test button', () => {
    render(<TestForm />);

    expect(screen.getByLabelText(/URL/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Test Connection/i })).toBeInTheDocument();
  });

  test('renders authorization header input', () => {
    render(<TestForm />);

    expect(screen.getByLabelText(/Authorization/i)).toBeInTheDocument();
  });

  test('shows detected fields after successful test', async () => {
    render(<TestForm />);

    const urlInput = screen.getByLabelText(/URL/i);
    const authInput = screen.getByLabelText(/Authorization/i);
    const testButton = screen.getByRole('button', { name: /Test Connection/i });

    fireEvent.change(urlInput, { target: { value: 'http://localhost:3001/orders' } });
    fireEvent.change(authInput, { target: { value: 'Bearer demo' } });
    fireEvent.click(testButton);

    // Wait for fields to appear
    expect(await screen.findByText(/order_id/i)).toBeInTheDocument();
    expect(await screen.findByText(/customer_name/i)).toBeInTheDocument();
    expect(await screen.findByText(/amount/i)).toBeInTheDocument();
  });

  test('shows field types and sample values', async () => {
    render(<TestForm />);

    const urlInput = screen.getByLabelText(/URL/i);
    const testButton = screen.getByRole('button', { name: /Test Connection/i });

    fireEvent.change(urlInput, { target: { value: 'http://localhost:3001/orders' } });
    fireEvent.click(testButton);

    // Wait for schema to load
    await waitFor(() => {
      expect(screen.getByText(/order_id/i)).toBeInTheDocument();
    });

    // Check types are displayed
    expect(screen.getByText(/integer/i)).toBeInTheDocument();
    expect(screen.getByText(/string/i)).toBeInTheDocument();
    expect(screen.getByText(/number/i)).toBeInTheDocument();
  });

  test('shows error card when server returns ok:false', async () => {
    server.use(
      http.post('/api/test', () => {
        return HttpResponse.json(mockErrorResponse);
      })
    );

    render(<TestForm />);

    const urlInput = screen.getByLabelText(/URL/i);
    const testButton = screen.getByRole('button', { name: /Test Connection/i });

    fireEvent.change(urlInput, { target: { value: 'http://localhost:3001/orders' } });
    fireEvent.click(testButton);

    // Wait for error to appear
    expect(await screen.findByText(/401.*Unauthorized/i)).toBeInTheDocument();
    expect(await screen.findByText(/Authentication failed/i)).toBeInTheDocument();
  });

  test('shows Retry button on error', async () => {
    server.use(
      http.post('/api/test', () => {
        return HttpResponse.json(mockErrorResponse);
      })
    );

    render(<TestForm />);

    const urlInput = screen.getByLabelText(/URL/i);
    const testButton = screen.getByRole('button', { name: /Test Connection/i });

    fireEvent.change(urlInput, { target: { value: 'http://localhost:3001/orders' } });
    fireEvent.click(testButton);

    // Wait for error and retry button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });
  });

  test('shows Download button after successful test', async () => {
    render(<TestForm />);

    const urlInput = screen.getByLabelText(/URL/i);
    const testButton = screen.getByRole('button', { name: /Test Connection/i });

    fireEvent.change(urlInput, { target: { value: 'http://localhost:3001/orders' } });
    fireEvent.click(testButton);

    // Wait for download button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Download/i })).toBeInTheDocument();
    });
  });

  test('shows loading state during API call', async () => {
    render(<TestForm />);

    const urlInput = screen.getByLabelText(/URL/i);
    const testButton = screen.getByRole('button', { name: /Test Connection/i });

    fireEvent.change(urlInput, { target: { value: 'http://localhost:3001/orders' } });
    fireEvent.click(testButton);

    // Check for loading state
    expect(screen.getByText(/Testing/i)).toBeInTheDocument();

    // Wait for results
    await waitFor(() => {
      expect(screen.queryByText(/Testing/i)).not.toBeInTheDocument();
    });
  });

  test('disables Test button when URL is empty', () => {
    render(<TestForm />);

    const testButton = screen.getByRole('button', { name: /Test Connection/i });

    expect(testButton).toBeDisabled();
  });

  test('enables Test button when URL is provided', () => {
    render(<TestForm />);

    const urlInput = screen.getByLabelText(/URL/i);
    const testButton = screen.getByRole('button', { name: /Test Connection/i });

    fireEvent.change(urlInput, { target: { value: 'http://api.example.com/data' } });

    expect(testButton).not.toBeDisabled();
  });

  test('shows pagination info when present', async () => {
    render(<TestForm />);

    const urlInput = screen.getByLabelText(/URL/i);
    const testButton = screen.getByRole('button', { name: /Test Connection/i });

    fireEvent.change(urlInput, { target: { value: 'http://localhost:3001/orders' } });
    fireEvent.click(testButton);

    // Wait for pagination info
    await waitFor(() => {
      expect(screen.getByText(/page/i)).toBeInTheDocument();
    });
  });

  test('handles network errors gracefully', async () => {
    server.use(
      http.post('/api/test', () => {
        return HttpResponse.error();
      })
    );

    render(<TestForm />);

    const urlInput = screen.getByLabelText(/URL/i);
    const testButton = screen.getByRole('button', { name: /Test Connection/i });

    fireEvent.change(urlInput, { target: { value: 'http://localhost:3001/orders' } });
    fireEvent.click(testButton);

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  test('shows paste sample button when API returns non-JSON', async () => {
    server.use(
      http.post('/api/test', () => {
        return HttpResponse.json({
          ok: false,
          status: 200,
          message: 'Non-JSON response received',
          hints: 'The API returned non-JSON data. Try pasting a sample JSON response manually to continue.'
        });
      })
    );

    render(<TestForm />);

    const urlInput = screen.getByLabelText(/URL/i);
    const testButton = screen.getByRole('button', { name: /Test Connection/i });

    fireEvent.change(urlInput, { target: { value: 'https://api.example.com/html' } });
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(screen.getByText(/Non-JSON response received/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Try pasting a sample JSON/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Paste Sample/i })).toBeInTheDocument();
  });

  test('allows pasting sample JSON when API fails', async () => {
    const mockSampleResponse = {
      ok: true,
      samplePath: '$',
      fields: [
        { name: 'user_id', type: 'integer', sample: 1 },
        { name: 'username', type: 'string', sample: 'Test' }
      ],
      source: 'pasted-sample'
    };

    server.use(
      http.post('/api/test-sample', () => {
        return HttpResponse.json(mockSampleResponse);
      })
    );

    render(<TestForm />);

    // Click Paste Sample button
    const pasteSampleButton = screen.getByRole('button', { name: /Paste Sample/i });
    fireEvent.click(pasteSampleButton);

    // Should show textarea for sample
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/paste.*JSON|JSON.*sample/i)).toBeInTheDocument();
    });

    const sampleTextarea = screen.getByPlaceholderText(/paste.*JSON|JSON.*sample/i);
    const submitButton = screen.getByRole('button', { name: /Test Sample/i });

    // Enter sample JSON
    const sampleJSON = JSON.stringify([
      { user_id: 1, username: 'Test' },
      { user_id: 2, username: 'Test2' }
    ]);

    fireEvent.change(sampleTextarea, { target: { value: sampleJSON } });
    fireEvent.click(submitButton);

    // Should show results
    await waitFor(() => {
      expect(screen.getByText(/Detected Schema/i)).toBeInTheDocument();
    });

    // Check for field names in table
    expect(screen.getByText('user_id')).toBeInTheDocument();
    expect(screen.getByText('username')).toBeInTheDocument();
  });

  test('shows error when pasted sample is invalid JSON', async () => {
    server.use(
      http.post('/api/test-sample', () => {
        return HttpResponse.json({
          ok: false,
          message: 'Invalid JSON: Could not parse the sample data',
          hints: 'Please ensure the pasted data is valid JSON format.'
        });
      })
    );

    render(<TestForm />);

    const pasteSampleButton = screen.getByRole('button', { name: /Paste Sample/i });
    fireEvent.click(pasteSampleButton);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/paste.*JSON|JSON.*sample/i)).toBeInTheDocument();
    });

    const sampleTextarea = screen.getByPlaceholderText(/paste.*JSON|JSON.*sample/i);
    const submitButton = screen.getByRole('button', { name: /Test Sample/i });

    fireEvent.change(sampleTextarea, { target: { value: 'invalid json {' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Invalid JSON/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/parse/i)).toBeInTheDocument();
  });
});
