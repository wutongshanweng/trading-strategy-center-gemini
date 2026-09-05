# Broker Integration Boundary

Live trading is disabled until an authenticated adapter is implemented and explicitly enabled.

The integration contract is defined in `trading/broker_adapter.py` and requires:

- Client order IDs and idempotency keys on every submission.
- Explicit accepted, partial-fill, fill, cancellation, rejection, position, and account states.
- Broker-to-local reconciliation for open orders, positions, cash, equity, and daily PnL.
- A global kill switch, stale-market-data blocking, maximum daily loss, and maximum position limits.
- Persistence of request, risk decision, broker response, fills, and reconciliation differences before unattended operation.

`DisabledLiveBroker` is the only default implementation and always fails closed. Adding a broker requires a separate adapter, credentials supplied through secret storage, paper/shadow acceptance, and explicit production enablement. No real broker API calls are present in this repository.
