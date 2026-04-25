# Database

Thread-Watcher supports multiple database alternatives by design and it is (decently) easy to support new ones!

## Craft it

Go grab your prefered beverage (Thread-Watcher runs on [white monster](https://www.monsterenergy.com/sv-se/energy-drinks/monster-ultra/zero-sugar-ultra/), but you do you) this might take a while.

Create a new directory in [/bot/src/database/](/bot/src/database/), preferably with a name hinting at what database it is implementing. This'll be the directory that your shiny new database implementation will live in!

While it is not strictly required, I suggest you use [Drizzle](https://orm.drizzle.team/) or any other ORM to keep your implementation nice and tidy. In the case of the [Sqlite](/bot/src/database/sqlite/) or [MySql](/bot/src/database/mysql/) adapter I use a three file approach:

- **adapter.ts** - The main logic of the adapter
- **relations.ts** - definition of relations between data entities
- **schema.ts** - definition of data entities

<small>...but this is up to you! The data is your oyster?</small>

The only **real** requirement is that your database implementation implements the [Database](/bot/src/interfaces/Database.ts) interface! Feel free to take a peek into any of the existing implementations to see how it's done on the official adapters.

## Make it known

Great work writing the implementation! Now we have to make sure Thread-Watcher knows it exists.

Start by adding it to the `get_database_instance` function in [/bot/src/database/index.ts](/bot/src/database/index.ts)

```ts
import MyDbHandler from "./my_handler/adapter";
// ...
export default function get_database_instance(config: ConfigType): Database {
  let handler_type;
  switch (config.database.flavour) {
    case "sqlite":
      handler_type = SqliteHandler;
      break;
    case "mysql":
      handler_type = MysqlHandler;
      break;
    // Add your handler here! Make sure to import it :)
    case "your_db_implementation":
      handler_type = MyDbHandler;
      break;
    default:
      throw new Error(
        `No database adapter set for '${(config.database as any).flavour}'`,
      );
  }

  const instance = new handler_type(config);

  return instance;
}
```

Great! Now we need to make sure the [bot config parser](/bot/src/utilities/config.ts) knows it's a valid option. You do that by adding a [Zod](https://zod.dev/) type for it! Here you can define whatever values that the database needs to work.

```ts
const MyDbHandlerConfig = BaseDb.extend({
  // Make sure to replace `your_db_implementation` with the same name you used above in the switch
  flavour: z
    .literal("your_db_implementation")
    .default("your_db_implementation"),
  // These are example values taken from the MySql adapter. Feel free to extend or remove
  host: z.string(),
  user: z.string(),
  password: z.string(),
  name: z.string(),
  connection_limit: z.number().default(5),
});

// Add it to the discriminated union too
const Database = z.discriminatedUnion("flavour", [
  SqliteConnection,
  MySqlConnection,
  MyDbHandlerConfig,
]);
```

## About Nosql databases

While it's not strictly impossible, Thread-Watcher is build with relational databases in mind. You are more than welcome to see if you can get a mongo db implementation working... ririko5834 [has been waiting](https://github.com/ffamilyfriendly/Thread-Watcher/issues/37) :\)
