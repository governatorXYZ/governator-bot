# Changelog

## 0.4.0

1. update to discord.js14 & other dependencies

## 0.3.0

1. updated to current governator-api
   1. Updated Poll schema
   2. Update poll with message ID after POLL_CREATE
   3. Respond to POLL_COMPLETE event
   4. use new vote api (remove need for running strategy by client)
   5. use new results api
2. Fix REQUEST_CLIENT_DATA event handlers
3. Add role gating
4. poll embed improved layout
   1. display vote count, final results, pfp, strategy, poll expiration and role gating
5. ephemeral confirmation message improved UI
6. remove unused dependencies
7. update documentation

## 0.2.0

1. SSE events and slash-create events initialized in similar manner as discordjs events
2. code restructured according to new event structure
3. component interaction handled via slash-create
4. ephemeral confirmation message sent to user after vote

## 0.1.0-PROOF-OF-CONCEPT

1. bot listens to SSE & posts poll upon event
2. bot connects to governator api via api key
3. bot handles button interaction to submit vote request to governator api
4. bot creates governator user for discord users without user account
5. bot updates poll message embed counter according to vote response
6. bot listens to SSE data request event from governator api to post channels and roles list
7. mongodb functionality was disabled because handled by backend
8. sentry and logdna disabled for faster POC development
9. slash-create updated
