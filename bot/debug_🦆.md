## IPC manager

really quite a mess at the moment lol.

What im thinking is:

- when an event is sent from the sharding manager to a shard, that shard can (but is not required to) respond to the event.
  - this is usefull when, for example, the sharding manager asks a shard to "watch" a thread and we might want a confirmation.
  - we're not waiting for responses when a message is sent from shard -> shardmanager as that is not as useful
  -
