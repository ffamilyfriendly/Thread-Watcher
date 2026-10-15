<script lang="ts">
	import { enhance } from '$app/forms';
	import { TW_LIBRARY_ALLOWED_MIMETYPES, TW_LIBRARY_MAX_FILESIZE } from '@watcher/shared';
	import type { PageProps } from './$types';
	import Button from '$lib/components/ui/Button.svelte';
	import UserLoader from '$lib/components/ui/discord/user/UserLoader.svelte';
	import { get_pwetty_relative_time } from '$lib/client/time_util';
	import { s_tooltip, tooltip } from '$lib/client/attachments/tooltip';
	import { FileIcon, TextIcon, Trash } from '@lucide/svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import type { SubmitFunction } from '@sveltejs/kit';

	const { data, form }: PageProps = $props();

	let file_can_be_uploaded: { ok: boolean; reason?: string } = $state({ ok: false });
	let is_hovered = $state(false);

	let show_file_upload = $state(false);
	let show_text_upload = $state(false);
	let file_input_ref = $state<HTMLInputElement>();

	function clear_file() {
		if (file_input_ref) file_input_ref.value = '';
		file_can_be_uploaded = { ok: false };
	}

	function file_is_ok(file: File) {
		if (file.size > TW_LIBRARY_MAX_FILESIZE) return { ok: false, reason: 'File is too big!' };

		const is_allowed_type =
			TW_LIBRARY_ALLOWED_MIMETYPES.includes(file.type) ||
			(file.type === '' && /\.(txt|md|html|pdf)$/i.test(file.name));

		if (!is_allowed_type) return { ok: false, reason: 'File type is unsupported!' };
		return { ok: true };
	}

	function files_is_ok(files: FileList) {
		if (files.length != 1) return { ok: false, reason: 'only one file can be uploaded at once!' };
		const file = files[0];
		handle_file(file);
	}

	function validate_file(e: Event & { currentTarget: EventTarget & HTMLInputElement }) {
		const target = e.currentTarget;
		if (!target.files) return (file_can_be_uploaded = { ok: false });
		files_is_ok(target.files);
	}

	let filename = $state('uploaded');
	let file_content = $state('');
	const filename_proper = $derived(filename + '.txt');
	let selected_file = $state<File>();

	function handle_file(file: File) {
		const validation = file_is_ok(file);
		file_can_be_uploaded = validation;

		if (!validation.ok) {
			selected_file = undefined;
			return;
		}

		selected_file = file;

		if (file_input_ref) {
			const data_transfer = new DataTransfer();
			data_transfer.items.add(file);
			file_input_ref.files = data_transfer.files;
		}
	}

	let is_uploading = $state(false);

	const file_submit_handler: SubmitFunction = ({
		formElement,
		formData,
		action,
		cancel,
		submitter
	}) => {
		is_uploading = true;
		return async ({ result, update }) => {
			await update();
			is_uploading = false;
			show_file_upload = false;
			show_text_upload = false;
			clear_file();
			file_content = '';
			filename = 'uploaded';
		};
	};

	const text_submit_handler: SubmitFunction = (props) => {
		const { formElement, formData, action, cancel, submitter } = props;

		const upload_file = new File([file_content], filename_proper, { type: 'text/plain' });

		formData.delete('filename');
		formData.delete('file_content');
		formData.append('file', upload_file);

		return file_submit_handler(props);
	};

	function get_file(e: DragEvent) {
		if (!e.dataTransfer) return null;
		const files = [...e.dataTransfer.items].filter((item) => item.kind === 'file');
		if (files.length === 0) return null;
		const file = files[0];
		return file.getAsFile();
	}

	function drag_generic(e: DragEvent) {
		e.preventDefault();
	}

	function drag_leave(_e: DragEvent) {
		is_hovered = false;
	}

	function drag_enter(e: DragEvent) {
		e.preventDefault();
		is_hovered = true;
	}

	function drop(e: DragEvent) {
		e.preventDefault();
		is_hovered = false;

		const file = get_file(e);
		if (!file) return;

		handle_file(file);
	}

	const colours = {
		completed: 'green',
		processing: 'gray',
		error: 'red'
	};

	const usage_bar_colour = $derived.by(() => {
		if (!data.guild_files.usage) return 'white';
		const usg = data.guild_files.usage.usage;

		if (usg > 0.8) return 'red';
		if (usg > 0.5) return 'orange';
		return 'white';
	});

	const can_upload_more = $derived.by(() => {
		if (!data.guild_files.usage) return true;
		return data.guild_files.usage.can_add_more;
	});
</script>

<div class="file_list">
	{#each data.guild_files.files as file (file.file_id)}
		<div class="entry">
			<div class="head">
				<span
					{@attach s_tooltip(`This file is ${file.status}`)}
					class="diode {colours[file.status]}"
				></span>
				<p>{file.filename}</p>
				<p class="timestamp">{get_pwetty_relative_time(file.created_at)}</p>
				<form method="POST" action="?/remove_upload" style="display: contents;">
					<input type="hidden" name="file_id" value={file.file_id} />
					<Button variant="none"><Trash color="var(--error-500)" size="1rem" /></Button>
				</form>
			</div>

			<div class="body">
				<p>
					Uploaded by <UserLoader style="inline" user_id={file.uploader_discord_id} />
				</p>
			</div>
		</div>
	{:else}
		<div class="entry">
			<div class="head">
				<span class="diode gray"></span>
				<p>No files yet...</p>
				<p class="timestamp">upload some files pls</p>
			</div>

			<div class="body">
				<p>
					{#if data.session?.user.id}
						<UserLoader style="inline" user_id={'286224826170081290'} /> appriciates <UserLoader
							style="inline"
							user_id={data.session.user.id}
						/> using Thread-Watcher &lt;3
					{:else}
						<UserLoader style="inline" user_id={'286224826170081290'} /> wonders how you can see this?
						(no session established)
					{/if}
				</p>
			</div>
		</div>
	{/each}

	{#if data.guild_files.usage}
		<div
			{@attach tooltip({
				content: `You are using ${(data.guild_files.usage.usage * 100).toFixed(1)}% of your library`,
				followCursor: true
			})}
			class="usage"
		>
			<div
				class="inner {usage_bar_colour}"
				style="width: {data.guild_files.usage.usage * 100}%"
			></div>
		</div>
	{/if}
</div>

<div class="buttonthing">
	<Button disabled={!can_upload_more} on_click={() => (show_text_upload = true)} variant="tetriary"
		><TextIcon /> Upload Text</Button
	>
	<Button disabled={!can_upload_more} on_click={() => (show_file_upload = true)} variant="primary"
		><FileIcon /> Upload File</Button
	>
</div>

{#if show_file_upload}
	<Modal bind:set_open={show_file_upload} title="Upload File">
		<form
			enctype="multipart/form-data"
			method="post"
			action="?/upload"
			use:enhance={file_submit_handler}
		>
			{#if file_can_be_uploaded.reason}
				<p class="val_error">{file_can_be_uploaded.reason}</p>
			{/if}

			{#if selected_file && file_can_be_uploaded.ok}
				<div class="file_preview">
					<div class="file_info">
						<FileIcon color="white" size="28" />
						<div>
							<p class="name">{selected_file.name}</p>
							<p class="size">{(selected_file.size / 1024).toFixed(1)} KB</p>
						</div>
					</div>
					<Button variant="tetriary" on_click={clear_file}>Choose Different File</Button>
				</div>
			{:else}
				<button
					type="button"
					ondragover={drag_generic}
					ondragleave={drag_leave}
					ondrop={drop}
					ondragenter={drag_enter}
					title="file drop area"
					onclick={() => file_input_ref?.click()}
					class:active={is_hovered}
					class="droparea"
				>
					<div>
						<FileIcon color="white" />
						<p>Click to upload a file or drag one in</p>
					</div>
				</button>
			{/if}

			<input
				bind:this={file_input_ref}
				name="file"
				onchange={validate_file}
				required={true}
				type="file"
				accept={TW_LIBRARY_ALLOWED_MIMETYPES.join(',')}
				style="display: none;"
			/>

			<div class="buttonthing">
				<Button force_loading={is_uploading} disabled={!file_can_be_uploaded.ok}>Upload</Button>
			</div>
			{#if !form?.success}
				{form?.error}
			{/if}
		</form>
	</Modal>
{/if}

{#if show_text_upload}
	<Modal bind:set_open={show_text_upload} title="Upload Text">
		<form
			enctype="multipart/form-data"
			method="post"
			action="?/upload"
			use:enhance={text_submit_handler}
		>
			<div class="mock_file">
				<div class="header">
					<input name="filename" bind:value={filename} type="text" />
					<p>.txt</p>
				</div>
				<textarea
					placeholder="Please write your text here :)"
					name="file_content"
					bind:value={file_content}
				>
				</textarea>
			</div>

			<div class="buttonthing">
				<Button force_loading={is_uploading} disabled={!file_content || !filename}>Upload</Button>
			</div>
		</form>
	</Modal>
{/if}

<style lang="scss">
	.usage {
		background-color: var(--background-600);
		border-radius: 0.5rem;
		overflow: hidden;
		border: 1px solid color-mix(in srgb, var(--background-600) 90%, white);

		.inner {
			height: 0.7rem;

			&.white {
				background-color: rgba(255, 255, 255, 0.7);
			}

			&.orange {
				background-color: color-mix(in srgb, orange 70%, transparent);
			}

			&.red {
				background-color: color-mix(in srgb, var(--error-500) 70%, transparent);
			}
		}
	}

	.file_preview {
		height: 200px;
		width: 100%;
		background-color: var(--background-600);
		border-radius: 0.25rem;
		border: 1px solid color-mix(in srgb, var(--background-600) 90%, white);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		padding: 1.5rem;
		box-sizing: border-box;

		.file_info {
			display: flex;
			align-items: center;
			gap: 0.75rem;
			text-align: left;
			max-width: 100%;
			overflow: hidden;

			div {
				overflow: hidden;
			}

			.name {
				font-weight: 500;
				color: white;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}

			.size {
				font-size: 0.85rem;
				opacity: 0.7;
			}
		}
	}

	.droparea {
		cursor: pointer;
		height: 200px;
		width: 100%;
		background-color: var(--background-600);
		border-radius: 0.25rem;
		border: 1px solid color-mix(in srgb, var(--background-600) 90%, white);
		display: flex;
		align-items: center;
		justify-content: center;

		&.active {
			border-color: var(--success-600);
			background-color: color-mix(in srgb, var(--success-500) 5%, transparent);

			&.error {
				border-color: var(--error-600);
				background-color: color-mix(in srgb, var(--error-500) 5%, transparent);
			}
		}

		div {
			color: rgba(255, 255, 255, 0.7);
		}
	}

	.val_error {
		background-color: color-mix(in srgb, var(--error-500) 10%, transparent);
		border: 1px solid color-mix(in srgb, var(--error-500) 70%, transparent);
		border-radius: 0.25rem;
		padding: 0.25rem;
		margin-bottom: 1rem;
		color: color-mix(in srgb, var(--error-500) 10%, white);
	}

	.buttonthing {
		margin-top: 1rem;
		display: flex;
		justify-content: right;
		gap: 0.7rem;
	}

	.mock_file {
		display: flex;
		flex-direction: column;
		background-color: var(--background-600);
		border-radius: 0.25rem;
		border: 1px solid color-mix(in srgb, var(--background-600) 90%, white);

		.header {
			padding: 0.25rem 0.5rem;
			background-color: var(--background-500);
			display: flex;
			align-items: center;
			gap: 0.25rem;
			grid-template-columns: 1fr auto;
			border-bottom: 1px solid color-mix(in srgb, var(--background-600) 90%, white);

			input {
				background-color: rgba(255, 255, 255, 0.04);
				border-radius: 0.25rem;
				padding: 0.25rem 0.5rem;
				border: 0;
				color: inherit;
				outline: 0;
				min-width: 10ch;
			}
		}

		textarea {
			background-color: transparent;
			padding: 0.25rem 0.5rem;
			color: inherit;
			border: 0;
			outline: 0;
			min-height: 200px;
			resize: vertical;
		}
	}

	.file_list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.entry {
		--left_offset: 1rem;
		--head_gap: 0.5rem;
		--total_left_offset: calc(var(--left_offset) + var(--head_gap));
		background-color: var(--background-600);
		padding: 1rem;
		border-radius: 0.25rem;
		border: 1px solid color-mix(in srgb, var(--background-600) 90%, white);

		.head {
			display: grid;
			grid-template-columns: var(--left_offset) 1fr auto auto;
			align-items: center;
			gap: var(--head_gap);

			.timestamp {
				opacity: 0.7;
			}
		}

		.body {
			margin-left: var(--total_left_offset);
			display: flex;
			align-items: center;
			gap: 0.5rem;
			opacity: 0.9;
			margin-top: 0.25rem;

			p {
				display: inline-flex;
				align-items: center;
				gap: 0.3rem;
			}
		}
	}

	.diode {
		display: inline-block;
		width: 0.6rem;
		height: 0.6rem;
		border-radius: 50%;
		flex-shrink: 0;

		&.green {
			background-color: var(--success-500, #22c55e);
			box-shadow: 0 0 6px color-mix(in srgb, var(--success-500, #22c55e) 60%, transparent);
		}

		&.gray {
			--grayyyy: rgb(74, 74, 74);
			background-color: var(--grayyyy, #ef4444);
			box-shadow: 0 0 6px color-mix(in srgb, var(--grayyyy, #ef4444) 60%, transparent);
		}

		&.red {
			background-color: var(--error-500, red);
			box-shadow: 0 0 6px color-mix(in srgb, var(--error-500, red) 60%, transparent);
		}
	}
</style>
