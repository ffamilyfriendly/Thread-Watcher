# Scripts

Thread-Watcher includes some scripts that are used to automate tedious parts of development or generate type files. For example, Thread-Watcher features a strongly typed i18n functionality that relies on a build script. You can read more about it [on its' dedicated page](./i18n.md)

## Upload Emojis

> `npm run icons -w bot`
> This script will upload any files in [the Icons directory](/icons) as a application registered emoji. The script will upload the files to the application with the `client_id` specified in the bot configuration file, also using the Discord token defined there.

The script will fetch the currently registered app icons and only upload new .gif or .png files. Please note that this check is currently based on the file name which means that any changes to an image will not trigger a re-upload.

As these emojis are registered the script will also create a `emojis.json` file in the `/bot/.generated` directory. The emojis are used thru the `emoji()` function defined in `/utilities/use_emoji.ts`. This function is strongly types, meaning you will have full intellisense support for picking registered emojis. The function will automatically translate the icon name into the proper Discord emoji format, meaning you won't have to manually touch or change any configuration file to get your emojis working (as long as you register them).

```ts
import emoji from "#/utilities/use_emoji";
//...
interaction.reply(emoji("watch") + " watched thread!");
```
