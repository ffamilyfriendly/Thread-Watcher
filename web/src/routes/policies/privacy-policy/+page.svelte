<section>
	<h1>Thread-Watcher Privacy Policy</h1>
	<p><b>Last Updated:</b> 2026-04-12</p>
	<h2>Who We Are</h2>
	<p>
		Thread-Watcher ("we", "us", "our") is a Discord bot service operated by Jonathan Hermin
		("familyfriendly"), doing business as BotSuite. The service is based in Uppsala, Sweden and is
		therefore subject to the GDPR.
	</p>
	<p>
		Your privacy is important to us. This Privacy Policy exists to inform visitors of the website
		and associated Discord bot of our collection, use, and disclosure of personal data practices. In
		this policy we refer to the website and Discord bot collectively as the "Thread-Watcher
		services" or the "Services".
	</p>

	<p>
		We reserve the right to update and/or modify any part of this Privacy Policy without prior
		notice. It is your responsibility to periodically review this Privacy Policy to stay informed of
		any changes. Any changes will be reflected by the "Last Updated" date at the top of this page.
	</p>
</section>

<section>
	<h2>Definitions</h2>
	<ul>
		<li>
			<b>Server</b> or <b>guild</b> refers to a specific Discord server where the bot is being utilized.
		</li>
		<li>
			<b>Server Administrator</b> refers to any Discord user with the Administrator permission in the
			server, or any user holding a role designated as "Bot Master" in the bot configuration. These users
			have elevated access to Thread-Watcher's dashboard and configuration.
		</li>
	</ul>
</section>

<section>
	<h2>What Data We Collect</h2>
	<p>
		When Thread-Watcher is added to a Discord server and a user interacts with it, we may collect
		and store the following:
	</p>

	<h3>From Discord servers:</h3>
	<ul>
		<li>Guild ID and basic guild metadata</li>
		<li>Channel and thread IDs</li>
		<li>Role IDs</li>
	</ul>

	<h3>From server administrators:</h3>
	<ul>
		<li>Configuration settings per server</li>
		<li>Ticket panel configurations and pipeline definitions</li>
		<li>Audit log entries recording administrative actions</li>
	</ul>

	<h3>Cookies & Local Storage</h3>
	<p>
		We use essential functional cookies and local storage to manage your login session and save your
		dashboard preferences. We do not use third-party advertising or tracking cookies.
	</p>
</section>

<section>
	<h2>Why We Collect It</h2>
	<p>We collect this data solely to provide the services, specifically:</p>
	<ul>
		<li>To manage thread lifecycle (archiving, watching, monitoring)</li>
		<li>To provide a web dashboard for server administrators</li>
	</ul>
	<p>We do <b>not</b> sell your data. We do not use your data for advertising.</p>
</section>

<section>
	<h2>How Long We Keep It</h2>
	<p>
		We keep data, unless otherwise specified within this document, for no longer than 30 days after
		the bot has been removed from the server. Key retention periods are summarised below:
	</p>
	<ul>
		<li><b>Ticket messages</b>: no longer than 90 days from the date the ticket was opened</li>
		<li><b>File attachments</b>: no longer than 90 days from the date of upload</li>
		<li><b>Pipeline logs</b>: 7 days following completion of the pipeline</li>
		<li><b>System logs</b>: approximately 7 days</li>
		<li><b>Audit logs</b>: server-configured, not exceeding 90 days, default 24 hours</li>
		<li>
			<b>Server configuration</b>: retained while the bot is in the server, deleted within 30 days
			of removal
		</li>
	</ul>
	<p>For full details on any of the above, refer to the relevant section of this policy.</p>
</section>

<section>
	<h2>System Logs</h2>
	<p>
		Our bot, API, and web services produce system logs for the purpose of error handling, debugging,
		and security monitoring. These logs may incidentally contain Discord user IDs, usernames, guild
		IDs, and visitor IP addresses. Logs are automatically purged after approximately 7 days and are
		not used for any purpose beyond operational maintenance. Web server access logs are also
		collected by our hosting infrastructure and may be subject to Cloudflare's own data retention
		practices.
	</p>
</section>

<section>
	<h2>Ticket System</h2>
	<p>
		Thread-Watcher provides a ticket system that server administrators can configure and deploy to
		their Discord servers. The following describes how data is handled when you interact with a
		ticket panel.
	</p>

	<h3>Consent</h3>
	<p>
		Every ticket panel displays a notice at the bottom of the commencement message stating that by
		proceeding you agree to the Thread-Watcher Terms of Service and Privacy Policy. By clicking the
		ticket button or selecting an option to start the ticket pipeline, you are giving your informed
		consent to the data processing described in this section.
	</p>
	<p>
		When a ticket thread is created, a second notice is sent reminding you that messages sent within
		the ticket are stored in accordance with this Privacy Policy. If the server administrator has
		enabled AI summarization for the panel, this notice will explicitly inform you of this.
	</p>

	<h3>Ticket Pipeline</h3>
	<p>
		Before a ticket is created, you may be guided through a pipeline configured by the server
		administrator. This pipeline may collect information from you through question prompts including
		free text, selections, file uploads, and user or role selections. The answers you provide are
		stored as part of the ticket record.
	</p>
	<p>
		If the server administrator has enabled the AI Narrowing module, your answers and basic identity
		information (Discord user ID and username) will be sent to Mistral AI to facilitate a short
		follow-up conversation to gather additional context before the ticket is created.
	</p>
	<p>
		Server administrators may in the future be able to configure a Webhook module that forwards
		pipeline data, including your answers and identity information, to a URL of their choosing. This
		is subject to the server administrator's own privacy practices, for which Thread-Watcher accepts
		no responsibility.
	</p>
	<p>
		A log file containing your actions, the full pipeline state, and additional information
		regarding your usage of the ticket pipeline is collected and stored for 7 days following the
		completion of the pipeline. This log acts to provide the server administrator with essential
		information for troubleshooting any issues with the pipeline and is provided to you (the ticket
		creator) and the server administration.
	</p>

	<h3>Ticket Transcripts</h3>
	<p>
		Messages sent within a ticket thread are stored for the purpose of providing a ticket transcript
		to server staff and the ticket owner via the Thread-Watcher dashboard. Message content is
		retained for no longer than 90 days from the date the ticket was opened, regardless of whether
		the ticket has been resolved.
	</p>
	<p>
		File attachments such as images, videos, and audio files uploaded within a ticket are stored on
		Cloudflare R2 and retained for no longer than 90 days from the date of upload. Note that
		attachment retention is calculated independently from the ticket lifetime; an attachment
		uploaded on the final day of a ticket's life will remain stored for up to 90 days after that
		upload date, even if the ticket itself has been deleted.
	</p>
	<p>
		If the server administrator has enabled AI summarization, message content may periodically be
		sent to Mistral AI to generate summaries of the conversation. These summaries are stored as part
		of the ticket record and are subject to the same retention period as the ticket itself.
	</p>
	<p>
		Access to ticket transcripts is limited to server administrators as defined above, and any users
		holding a role that has been assigned to the ticket through the pipeline configuration
		("Assigned Roles"). Assigned role members are the staff tasked with handling the ticket and are
		granted access to the transcript through the Thread-Watcher dashboard for this purpose. Ticket
		creators can also access their own ticket transcript.
	</p>
	<p>
		We do <b>not</b> collect data from users who have not interacted with the services directly, and
		we do <b>not</b> read messages outside of designated ticket threads.
	</p>

	<h3>RSS Subscription</h3>
	<p>
		If you generate an RSS subscription link, your Discord user ID and guild ID are encoded into the
		subscription token for authentication purposes. This token grants read-only access to ticket
		metadata matching your selected filters. Subscription links are not automatically revoked; keep
		them private and contact us at privacy@botsuite.co if you believe yours has been compromised.
	</p>

	<h3>Server Administrator Responsibilities</h3>
	<p>
		Server administrators who deploy ticket panels are responsible for ensuring their communities
		are aware that ticket conversations are stored and may be summarized. By enabling the ticket
		system, server administrators accept the role of data controller for their users' data processed
		through these features, with Thread-Watcher acting as a data processor on their behalf.
	</p>
</section>

<section>
	<h2>Third Party Services</h2>
	<p>We use the following third party services to operate the service</p>
	<ul>
		<li>
			<b>Cloudflare</b> provides us with DDoS mitigation, DNS, limited analytics, and file
			attachment storage.
			<a href="https://www.cloudflare.com/privacypolicy/">Cloudflare Privacy Policy</a>
		</li>
		<li>
			<b>Mistral AI</b> provides us with ticket summarization (when enabled) and issue narrowing
			(when enabled). Message content from tickets may be sent to Mistral AI for processing.
			<a href="https://legal.mistral.ai/terms/partner-served-deployment-terms"
				>Mistral AI Privacy Policy</a
			>
		</li>
		<li>
			<b>Discord</b> is the platform Thread-Watcher operates on and also acts as our payment
			provider for Thread-Watcher Plus subscriptions. Payment processing, billing information, and
			subscription management are handled entirely by Discord. Thread-Watcher does not collect or
			store any payment card information.
			<a href="https://discord.com/privacy">Discord Privacy Policy</a>
		</li>
	</ul>
</section>

<section>
	<h2>Data Subject Rights</h2>
	<p>If you are located in the European Economic Area you have the right to:</p>
	<ul>
		<li><b>Access</b> the data we hold about you</li>
		<li><b>Rectification </b> of inaccurate data</li>
		<li><b>Erasure </b> ("right to be forgotten")</li>
		<li><b>Portability</b> of your data</li>
		<li><b>Object</b> to processing of your data</li>
	</ul>
	<p>
		To exercise any of these rights, contact us at privacy@botsuite.co. We will respond within 30
		days. Note that some data (such as message content in open tickets) may be retained by the
		server owner as a legitimate interest. In such cases we will work with you to find an
		appropriate resolution.
	</p>
</section>

<section>
	<h2>Data Security</h2>
	<p>
		We take reasonable technical measures to protect your data including encrypted storage, access
		controls, and presigned URLs for file access. No method of transmission over the internet is
		100% safe and we cannot guarantee absolute security.
	</p>
</section>

<section>
	<h2>External Links</h2>
	<p>
		The Services might link to external sites that are not operated by us. Please be aware that we
		have no control over the content or practices of these sites and cannot accept responsibility or
		liability for their respective privacy policies.
	</p>
</section>

<section>
	<h2>Contact</h2>
	<p>
		<b>Thread-Watcher</b> is a service provided by Jonathan Hermin, doing business as BotSuite. You may
		contact us about questions relating to this document or any other privacy related question by emailing
		privacy@botsuite.co. For any non-privacy related inquiry, please email hello@botsuite.co
	</p>
</section>
