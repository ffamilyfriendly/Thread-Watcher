# Supported Thread-Watcher databases
## Sqlite
the sqlite adapter is included and selected by default. No additional configuration is needed to run the bot with sqlite.

Adapter uses the better-sqlite3 library. 

**source code:** [sqlite adapter](https://github.com/ffamilyfriendly/Thread-Watcher/blob/main/bot/src/utilities/database/sqlite.ts)

## mysql
the mysql adapter will require you to host a mysql instance. This option is generally only recomended if your instance of thread-watcher handles a lot of guilds or threads. You will have to select the database in the config.ts file as well configure it in the same file.

adapter uses the mysql library.

**source code:** [mysql adapter](https://github.com/ffamilyfriendly/Thread-Watcher/blob/main/bot/src/utilities/database/mysql.ts)

# Implement own database adapter
To implement your own database adapter follow these steps:
1. create a file called [dbname].ts in this directory
2. create a class that implements the Database interface
3. add your database to the DataBases enum in DatabaseManager.ts and add it in the switch statement
4. select your database in config.ts
5. (optional) create a PR including your tested database adapter to allow others to use it 😎