import { useState } from 'react';
import './TestForm.css';

const TestForm = () => {
  const [url, setUrl] = useState('');
  const [authorization, setAuthorization] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [generatedToolJet, setGeneratedToolJet] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [showPasteSample, setShowPasteSample] = useState(false);
  const [sampleJSON, setSampleJSON] = useState('');

  const handleTest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setGeneratedToolJet(null);

    try {
      const requestBody = {
        url,
      };

      // Add authorization header if provided
      if (authorization) {
        requestBody.headers = {
          Authorization: authorization,
        };
      }

      const response = await fetch('/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.ok) {
        setResult(data);
      } else {
        setError(data);
      }
    } catch (err) {
      setError({
        ok: false,
        message: 'Network error occurred',
        hints: 'Please check your connection and try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    handleTest();
  };

  const handleDownload = () => {
    const dataStr = JSON.stringify(result, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'schema-result.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    const dataStr = JSON.stringify(result, null, 2);
    navigator.clipboard.writeText(dataStr);
  };

  const handleGenerateToolJet = async () => {
    setGenerating(true);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          schema: {
            url,
            samplePath: result.samplePath,
            fields: result.fields,
            pagination: result.pagination,
          },
          format: 'full',
        }),
      });

      const data = await response.json();
      setGeneratedToolJet(data);
    } catch (err) {
      console.error('Failed to generate ToolJet datasource:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadToolJet = () => {
    const dataStr = JSON.stringify(generatedToolJet, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tooljet-datasource.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleTestSample = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setGeneratedToolJet(null);

    try {
      const response = await fetch('/api/test-sample', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sample: sampleJSON
        }),
      });

      const data = await response.json();

      if (data.ok) {
        setResult(data);
        setShowPasteSample(false);
        setSampleJSON('');
      } else {
        setError(data);
      }
    } catch (err) {
      setError({
        ok: false,
        message: 'Network error occurred',
        hints: 'Please check your connection and try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePasteSample = () => {
    setShowPasteSample(!showPasteSample);
    if (!showPasteSample) {
      setError(null);
    }
  };

  return (
    <div className="test-form">
      <div className="header-section">
        <h1>Smart Data Connector</h1>
        <p className="subtitle">Transform any API into a ToolJet datasource instantly</p>
      </div>

      <div className="form-group">
        <label htmlFor="url">URL</label>
        <input
          id="url"
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.example.com/data"
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="authorization">Authorization</label>
        <input
          id="authorization"
          type="text"
          value={authorization}
          onChange={(e) => setAuthorization(e.target.value)}
          placeholder="Bearer your-token (optional)"
          disabled={loading}
        />
      </div>

      <div className="button-group">
        <button
          onClick={handleTest}
          disabled={!url || loading}
          className="test-button"
        >
          {loading ? 'Testing...' : 'Test Connection'}
        </button>
        <button
          onClick={handleTogglePasteSample}
          className="paste-sample-button"
          type="button"
        >
          {showPasteSample ? 'Use URL' : 'Paste Sample'}
        </button>
      </div>

      {showPasteSample && (
        <div className="paste-sample-section">
          <label htmlFor="sampleJSON">Sample JSON</label>
          <textarea
            id="sampleJSON"
            value={sampleJSON}
            onChange={(e) => setSampleJSON(e.target.value)}
            placeholder="Paste your sample JSON response here..."
            rows={8}
            disabled={loading}
          />
          <button
            onClick={handleTestSample}
            disabled={!sampleJSON || loading}
            className="test-sample-button"
          >
            {loading ? 'Testing...' : 'Test Sample'}
          </button>
        </div>
      )}

      {error && (
        <div className="error-card">
          <h2>Connection Failed</h2>
          <p className="error-message">
            {error.status ? `HTTP ${error.status}: ` : ''}
            {error.message}
          </p>
          {error.hints && <p className="error-hints">{error.hints}</p>}
          <button onClick={handleRetry} className="retry-button">
            Retry
          </button>
        </div>
      )}

      {result && result.ok && (
        <div className="results-card">
          <div className="results-header">
            <h2>Detected Schema</h2>
            <div className="action-buttons">
              <button onClick={handleCopy} className="copy-button">
                Copy
              </button>
              <button onClick={handleDownload} className="download-button">
                Download
              </button>
            </div>
          </div>

          {result.samplePath && (
            <div className="sample-path">
              <strong>Sample Path:</strong> {result.samplePath}
            </div>
          )}

          <div className="fields-section">
            <h3>Fields</h3>
            <table className="fields-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Sample</th>
                </tr>
              </thead>
              <tbody>
                {result.fields.map((field, index) => (
                  <tr key={index}>
                    <td className="field-name">{field.name}</td>
                    <td className="field-type">{field.type}</td>
                    <td className="field-sample">
                      {JSON.stringify(field.sample)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result.pagination && (
            <div className="pagination-section">
              <h3>Pagination</h3>
              <p className="pagination-info">
                Type: {result.pagination.type}, Page parameter: {result.pagination.pageParam}
                {result.pagination.limitParam && `, Limit parameter: ${result.pagination.limitParam}`}
              </p>
            </div>
          )}

          <div className="generate-section">
            <button
              onClick={handleGenerateToolJet}
              disabled={generating}
              className="generate-button"
            >
              {generating ? 'Generating...' : 'Generate ToolJet Datasource'}
            </button>
          </div>
        </div>
      )}

      {generatedToolJet && (
        <div className="tooljet-card">
          <div className="tooljet-header">
            <h2>ToolJet datasource generated successfully!</h2>
            <button onClick={handleDownloadToolJet} className="download-tooljet-button">
              Download ToolJet Datasource
            </button>
          </div>
          <p className="tooljet-info">
            Your ToolJet datasource configuration is ready. Click the button above to download
            the JSON file and import it into ToolJet.
          </p>
        </div>
      )}
    </div>
  );
};

export default TestForm;
