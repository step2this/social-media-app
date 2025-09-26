import { useState, useCallback } from 'react';
import { useHelloStore } from '../stores/helloStore';
import { apiClient, ApiError, NetworkError, ValidationError } from '../services/apiClient';

export function HelloWorld() {
  const [name, setName] = useState('');
  const { response, loading, error, setResponse, setLoading, setError } = useHelloStore();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError(null);

    try {
      const result = await apiClient.sendHello({ name: name || 'World' });
      setResponse(result);
    } catch (err) {
      let errorMessage = 'An unexpected error occurred';

      if (err instanceof NetworkError) {
        errorMessage = 'Unable to connect to the server. Please check your connection and try again.';
      } else if (err instanceof ValidationError) {
        errorMessage = `Invalid input: ${err.message}`;
      } else if (err instanceof ApiError) {
        errorMessage = `Server error: ${err.message}`;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      console.error('API Error:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [name, setResponse, setLoading, setError]);

  return (
    <div className="hello-world">
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
        <h2 className="tama-heading" style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-4)' }}>
          🐾 Pet Connection Test
        </h2>
        <p className="tama-text">
          Test your connection to the TamaFriends server and see if your pets can communicate!
        </p>
      </div>

      <form onSubmit={handleSubmit} className="hello-form">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your pet's name"
          className="hello-input"
        />
        <button type="submit" disabled={loading} className="hello-button">
          {loading ? '🐣 Connecting...' : '🌟 Send Pet Message'}
        </button>
      </form>

      {error && (
        <div className="error-message">
          🚨 Connection Error: {error}
        </div>
      )}

      {response && (
        <div className="hello-response">
          <h2>🎉 {response.message}</h2>
          <p>📡 Server time: {new Date(response.serverTime).toLocaleString()}</p>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--tama-gray-600)' }}>
              Your pets are successfully connected to TamaFriends! 🐕‍🦺
            </span>
          </div>
        </div>
      )}
    </div>
  );
}