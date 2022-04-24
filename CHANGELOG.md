# Changelog



## 1.0.0-PROOF-OF-CONCEPT

1. bot listens to SSE & posts poll upon event
2. bot connects to governator api via api key
3. bot handles button interaction to submit vote request to governator api
4. bot creates governator user for discord users without user account
5. bot updates poll message embed counter according to vote response
6. bot listens to SSE data request event from governator api to post channels and roles list
7. mongodb functionality was disabled because handled by backend
8. sentry and logdna disabled for faster POC development
9. slash-create updated
