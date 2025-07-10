## IPC manager

coming along nicely! Need to work on how exactly to properly handle responses to messages. Right now we're adding callbacks to a map
and running the callback whenever a response with the correct `request_id` comes along. Preferrably I'd like any `send(event, data)` function to return a promise
that resolves when the response is collected. We can probably implement this
