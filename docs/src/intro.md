# Introduction

This project pairs **SvelteKit**, **Cap'n Web** RPC, and **Automerge** to deliver a collaborative coffee-inventory dashboard. The UI, a local mock server, and the Cloudflare Durable Object all speak the same Automerge document, which guarantees convergence without manual conflict resolution.

The goals of this documentation are to:

- Explain how Automerge fits into the existing Cap'n Web transport.
- Detail the replication loop between browser and server.
- Describe the data model and persistence points so you can extend or replace them with confidence.
- Summarise the development workflow for both mock and Durable Object environments.

If you are new to Automerge, skim the [official tutorial](https://automerge.org/docs/tutorial/) first. The rest of this guide assumes familiarity with the concepts of documents, sync state, and change messages.
