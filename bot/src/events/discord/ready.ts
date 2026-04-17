import logger from '@providers/logger';
import { ActivityOptions, ActivityType, Client } from 'discord.js';
import { Event } from '#/interfaces/ClientEvent';
import { start_bumper_loop } from '#/routines/bump_threads';
import { thread_service } from '@providers/services/thread_service';
import { channel_service } from '@providers/services/channel_service';
import { ticket_service } from '@providers/services/ticket_service';

function format_number(n: number): string {
  if (n / 1_000_000 > 1) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n / 1000 > 1) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

const event: Event<Client> = {
  event_name: 'clientReady',
  event_callback(client) {
    logger.instance.debug(`Online as ${client.user?.username}`);

    let status_incr = 0;

    const change_status = async () => {
      const watched_threads = (await thread_service.get_count_threads()).unwrapOr(67);
      const active_monitors = (await channel_service.get_monitor_count()).unwrapOr(1337);
      const panel_count = (await ticket_service.get_panel_count()).unwrapOr(67);

      const variants: ActivityOptions[] = [
        { name: `${format_number(watched_threads)} threads 👀`, type: ActivityType.Watching },
        { name: `${format_number(active_monitors)} monitors!`, type: ActivityType.Watching },
        { name: `🎉 New and improved! threadwatcher.xyz` },
      ];

      if (panel_count >= 100) {
        variants.push({
          name: `🎟️ Managing ${format_number(panel_count)} ticket panels`,
        });
      } else {
        variants.push({ name: `Try out ticket panels - threadwatcher.xyz` });
      }

      let activity = variants[status_incr];

      if (Math.random() > 0.99) {
        activity = {
          name: 'who watches the watcher?',
        };
      }

      client.user?.setActivity(activity);

      status_incr = (status_incr + 1) % variants.length;
    };

    change_status();

    setInterval(change_status, 1000 * 60 * 10);

    // START ROUTINES DEPENDANT ON READY
    start_bumper_loop();
  },
};

export default event;
