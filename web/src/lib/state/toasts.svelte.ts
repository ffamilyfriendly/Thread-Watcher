import { LucideMessageCircleWarning, type IconProps } from '@lucide/svelte';
import type { Component } from 'svelte';

function get_id() {
	return Math.floor(Math.random() * 13_6767_69).toString(16);
}

type ToastType = 'info' | 'error' | 'success';
interface Toast {
	id: string;
	message: string;
	label?: string;
	type: ToastType;
	timeout?: number;
	icon?: Component<IconProps, {}, ''>;
}

let toast_list = $state<Toast[]>([]);

export function get_all_toasts() {
	return toast_list;
}

type ToastInit = Partial<Omit<Toast, 'id'>>;

const DEFAULT_TOAST: Omit<Toast, 'id'> = {
	message: 'toast message',
	type: 'info'
};

export function add_toast(toast_init: ToastInit) {
	const id = get_id();
	const init_with_required = Object.assign({ ...DEFAULT_TOAST }, toast_init);
	const toast: Toast = { id, ...init_with_required };
	toast_list.push(toast);

	if (toast.timeout) {
		setTimeout(() => remove_toast(toast.id), toast.timeout);
	}
}

export function add_toast_from_error(e: Error) {
	add_toast({
		message: e.message,
		label: e.name,
		type: 'error',
		icon: LucideMessageCircleWarning
	});
}

export function remove_toast(id: string) {
	toast_list = toast_list.filter((t) => t.id != id);
}
