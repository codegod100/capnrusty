<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { Coffee, RoastProfile } from '$lib/data/fixtures';
  import { coffeesStore, createDemoCoffee } from '$lib/stores/coffee';

  type RoastFilter = RoastProfile | 'all';

  const roasts: RoastFilter[] = ['all', 'light', 'medium', 'dark'];

  let filter = $state<RoastFilter>('all');
  let selectedId = $state<string | null>(null);
  let lastUpdated = $state<Date | null>(null);
  let coffees = $state<Coffee[]>([]);
  let notification = $state<string | null>(null);
  let isCreating = $state(false);
  let notificationTimer: ReturnType<typeof setTimeout> | null = null;

  $effect(() => {
    const unsubscribe = coffeesStore.subscribe((value) => {
      coffees = value;
    });

    return () => unsubscribe();
  });

  const filtered = $derived(
    filter === 'all' ? coffees : coffees.filter((coffee) => coffee.roast === filter)
  );

  const selected = $derived(filtered.find((coffee) => coffee.id === selectedId) ?? null);

  $effect(() => {
    if (coffees.length > 0) {
      lastUpdated = new Date();
    }
  });

  const setSelection = (coffee: Coffee) => {
    selectedId = coffee.id;
  };

  const triggerNotification = (message: string) => {
    if (notificationTimer) {
      clearTimeout(notificationTimer);
    }
    notification = message;
    notificationTimer = setTimeout(() => {
      notification = null;
      notificationTimer = null;
    }, 5000);
  };

  const handleCreate = async () => {
    if (isCreating) return;

    isCreating = true;
    try {
      const coffee = await createDemoCoffee();
      selectedId = coffee.id;
      triggerNotification(`New coffee "${coffee.name}" is ready to explore.`);
    } catch (err) {
      console.error('Failed to create demo coffee.', err);
      triggerNotification('Could not brew a new coffee right now. Please try again.');
    } finally {
      isCreating = false;
    }
  };

  onDestroy(() => {
    if (notificationTimer) {
      clearTimeout(notificationTimer);
    }
  });
</script>

<svelte:head>
  <title>Cap'n Web Coffee Inventory</title>
  <meta
    name="description"
    content="Live fixture data streamed from a Cap'n Web RPC server over WebSocket"
  />
</svelte:head>

<main>
  {#if notification}
    <div class="notification" role="status" aria-live="polite">
      {notification}
    </div>
  {/if}

  <header class="hero">
    <div class="hero-copy">
      <h1>Cap'n Web Coffee Inventory</h1>
      <p>
        This dashboard connects to a Cap'n Web RPC server over WebSocket to hydrate fixture data and
        stay in sync with live stock updates.
      </p>
      {#if lastUpdated}
        <p class="timestamp">Last update: {lastUpdated.toLocaleTimeString()}</p>
      {/if}
    </div>

    <div class="actions">
      <button
        type="button"
        class="create-button"
        on:click={handleCreate}
        disabled={isCreating}
      >
        {#if isCreating}
          Brewing new coffee...
        {:else}
          Brew a demo coffee
        {/if}
      </button>
      <p class="actions-hint">Triggers a server-side creation and pushes updates to connected clients.</p>
    </div>
  </header>

  <section class="controls" aria-label="Roast filter">
    {#each roasts as roast}
      <button
        type="button"
        class:active={filter === roast}
        on:click={() => {
          filter = roast;
          selectedId = null;
        }}
      >
        {roast === 'all' ? 'All roasts' : `${roast.slice(0, 1).toUpperCase()}${roast.slice(1)} roast`}
      </button>
    {/each}
  </section>

  <section class="layout">
    <section class="inventory" aria-live="polite">
      {#if filtered.length === 0}
        <p class="empty">No coffees match the current filter.</p>
      {:else}
        <ul>
          {#each filtered as coffee (coffee.id)}
            <li>
              <button
                type="button"
                class:selected={selectedId === coffee.id}
                on:click={() => setSelection(coffee)}
                aria-pressed={selectedId === coffee.id}
              >
                <span class="name">{coffee.name}</span>
                <span class="origin">{coffee.origin}</span>
                <div class="metrics">
                  <span class="badge">{coffee.roast} roast</span>
                  <span class="stock">{coffee.stock} bags</span>
                  <span class="price">${coffee.price.toFixed(2)}</span>
                </div>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <aside class="details" aria-live="polite">
      {#if selected}
        <h2>{selected.name}</h2>
        <p class="subtitle">{selected.origin} &middot; {selected.roast} roast</p>
        <div class="detail-metric">
          <h3>Stock on hand</h3>
          <p>{selected.stock} bags ready to ship</p>
        </div>
        <div class="detail-metric">
          <h3>Price</h3>
          <p>${selected.price.toFixed(2)}</p>
        </div>
        <div class="notes">
          <h3>Tasting notes</h3>
          <ul>
            {#each selected.tastingNotes as note}
              <li>{note}</li>
            {/each}
          </ul>
        </div>
      {:else}
        <div class="placeholder">
          <h2>Select a coffee to inspect</h2>
          <p>Choose a roast from the inventory to see live metrics and tasting notes.</p>
        </div>
      {/if}
    </aside>
  </section>
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: radial-gradient(circle at top, #121726, #0b0d16 45%, #05060b 100%);
    color: #f1f5f9;
  }

  main {
    min-height: 100vh;
    padding: 3rem clamp(1.5rem, 4vw, 4rem);
    display: flex;
    flex-direction: column;
    gap: 2.5rem;
    box-sizing: border-box;
  }

  .notification {
    align-self: flex-start;
    padding: 0.85rem 1.25rem;
    border-radius: 0.85rem;
    background: linear-gradient(135deg, rgba(94, 234, 212, 0.2), rgba(129, 140, 248, 0.25));
    border: 1px solid rgba(94, 234, 212, 0.4);
    color: rgba(226, 232, 240, 0.95);
    font-weight: 500;
    box-shadow: 0 12px 28px rgba(79, 70, 229, 0.25);
  }

  .hero {
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1.75rem;
  }

  .hero-copy {
    flex: 1 1 420px;
    min-width: 260px;
    max-width: 720px;
    display: grid;
    gap: 1rem;
  }

  h1 {
    margin: 0;
    font-size: clamp(2.5rem, 6vw, 3.5rem);
    line-height: 1.05;
  }

  .hero-copy p {
    margin: 0;
    color: rgba(226, 232, 240, 0.85);
    font-size: 1.05rem;
  }

  .timestamp {
    font-size: 0.95rem;
    color: rgba(148, 163, 184, 0.9);
  }

  .actions {
    display: grid;
    gap: 0.65rem;
    justify-items: flex-start;
  }

  .create-button {
    background: linear-gradient(135deg, rgba(94, 234, 212, 0.65), rgba(59, 130, 246, 0.6));
    border: 1px solid rgba(165, 243, 252, 0.65);
    border-radius: 999px;
    padding: 0.75rem 1.85rem;
    color: #010409;
    font-weight: 600;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    cursor: pointer;
    transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
  }

  .create-button:hover:enabled {
    transform: translateY(-1px);
    box-shadow: 0 18px 40px rgba(94, 234, 212, 0.35);
    filter: brightness(1.05);
  }

  .create-button:disabled {
    cursor: wait;
    opacity: 0.65;
    box-shadow: none;
  }

  .actions-hint {
    margin: 0;
    font-size: 0.85rem;
    color: rgba(148, 163, 184, 0.8);
    max-width: 260px;
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .controls button {
    background: rgba(15, 23, 42, 0.72);
    border: 1px solid rgba(94, 234, 212, 0.2);
    border-radius: 999px;
    padding: 0.6rem 1.5rem;
    color: inherit;
    font-weight: 500;
    letter-spacing: 0.01em;
    transition: all 0.2s ease;
    cursor: pointer;
  }

  .controls button:hover {
    border-color: rgba(94, 234, 212, 0.4);
    transform: translateY(-1px);
  }

  .controls button.active {
    background: linear-gradient(135deg, rgba(94, 234, 212, 0.2), rgba(79, 70, 229, 0.35));
    border-color: rgba(94, 234, 212, 0.5);
    box-shadow: 0 18px 40px rgba(79, 70, 229, 0.25);
  }

  .layout {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
    gap: 2rem;
  }

  .inventory {
    background: rgba(15, 23, 42, 0.68);
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 1.75rem;
    padding: 2rem;
    backdrop-filter: blur(18px);
  }

  .inventory ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 1rem;
  }

  .inventory li {
    list-style: none;
  }

  .inventory button {
    display: grid;
    gap: 0.4rem;
    padding: 1.25rem 1.5rem;
    border-radius: 1.25rem;
    background: rgba(30, 41, 59, 0.8);
    border: 1px solid transparent;
    transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
    cursor: pointer;
    color: inherit;
    font: inherit;
    text-align: left;
    width: 100%;
  }

  .inventory button:hover,
  .inventory button:focus-visible {
    outline: none;
    transform: translateY(-2px);
    border-color: rgba(94, 234, 212, 0.35);
    background: rgba(51, 65, 85, 0.85);
  }

  .inventory button.selected {
    border-color: rgba(129, 140, 248, 0.75);
    background: linear-gradient(135deg, rgba(148, 163, 184, 0.18), rgba(79, 70, 229, 0.28));
    box-shadow: 0 18px 45px rgba(79, 70, 229, 0.3);
  }

  .name {
    font-size: 1.2rem;
    font-weight: 600;
  }

  .origin {
    color: rgba(148, 163, 184, 0.85);
    font-size: 0.95rem;
  }

  .metrics {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    font-size: 0.9rem;
    flex-wrap: wrap;
  }

  .badge {
    background: rgba(79, 70, 229, 0.25);
    border-radius: 999px;
    padding: 0.25rem 0.85rem;
    font-size: 0.8rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .stock {
    color: rgba(248, 250, 252, 0.9);
    font-weight: 500;
  }

  .price {
    color: rgba(94, 234, 212, 0.9);
    font-weight: 600;
  }

  .empty {
    margin: 0;
    color: rgba(148, 163, 184, 0.85);
  }

  .details {
    background: rgba(15, 23, 42, 0.55);
    border: 1px solid rgba(94, 234, 212, 0.1);
    border-radius: 1.75rem;
    padding: 2rem;
    backdrop-filter: blur(12px);
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .details h2 {
    margin: 0;
    font-size: 1.75rem;
  }

  .subtitle {
    margin: 0;
    color: rgba(148, 163, 184, 0.75);
  }

  .detail-metric h3,
  .notes h3 {
    margin-bottom: 0.4rem;
    font-size: 1rem;
    color: rgba(148, 163, 184, 0.9);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .detail-metric p {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 500;
  }

  .notes ul {
    margin: 0;
    padding-left: 1.25rem;
    color: rgba(226, 232, 240, 0.9);
  }

  .placeholder {
    margin: auto 0;
    text-align: center;
    color: rgba(148, 163, 184, 0.85);
    display: grid;
    gap: 0.75rem;
  }

  @media (max-width: 960px) {
    .layout {
      grid-template-columns: 1fr;
    }

    .details {
      order: -1;
    }
  }

  @media (max-width: 640px) {
    main {
      padding: 2rem 1.25rem 3rem;
    }

    .hero {
      flex-direction: column;
      align-items: stretch;
    }

    .actions {
      width: 100%;
    }

    .create-button {
      width: 100%;
      text-align: center;
    }

    .inventory,
    .details {
      padding: 1.5rem;
    }
  }
</style>
