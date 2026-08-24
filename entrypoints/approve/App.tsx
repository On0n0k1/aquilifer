import { useState } from 'react';
import {
  AQUILIFER_INTERNAL_KIND,
  type ResolveConnectMessage,
} from '../../lib/internal-protocol';

function getOriginFromQuery(): string {
  return new URLSearchParams(window.location.search).get('origin') ?? '';
}

function App() {
  const [origin] = useState(getOriginFromQuery);
  const [responded, setResponded] = useState(false);

  async function respond(approve: boolean) {
    setResponded(true);
    const message: ResolveConnectMessage = {
      kind: AQUILIFER_INTERNAL_KIND,
      type: 'resolveConnect',
      origin,
      approve,
    };
    await browser.runtime.sendMessage(message);
    window.close();
  }

  return (
    <main>
      <h1>Connection request</h1>
      <p>
        <strong>{origin}</strong> wants to connect to Aquilifer and send
        requests to your configured LLM.
      </p>
      <div className="actions">
        <button onClick={() => respond(false)} disabled={responded}>
          Deny
        </button>
        <button onClick={() => respond(true)} disabled={responded} autoFocus>
          Approve
        </button>
      </div>
    </main>
  );
}

export default App;
