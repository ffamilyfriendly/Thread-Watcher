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
	timeout?: number | null;
	icon?: Component<IconProps, {}, ''>;
}

let toast_list = $state<Toast[]>([]);

export function get_all_toasts() {
	return toast_list;
}

type ToastInit = Partial<Omit<Toast, 'id'>>;

const DEFAULT_TOAST: Omit<Toast, 'id'> = {
	message: 'toast message',
	type: 'info',
	timeout: 3000
};

export function add_toast(toast_init: ToastInit) {
	const id = get_id();
	const toast: Toast = { id, ...DEFAULT_TOAST, ...toast_init };
	toast_list.push(toast);

	if (typeof toast.timeout === 'number' && toast.timeout > 0) {
		setTimeout(() => remove_toast(toast.id), toast.timeout);
	}
}

export function add_toast_from_error(e: Error) {
	add_toast({
		message: e.message,
		label: e.name,
		type: 'error',
		icon: LucideMessageCircleWarning,
		timeout: null
	});
}

export function remove_toast(id: string) {
	const index = toast_list.findIndex((t) => t.id === id);
	if (index !== -1) {
		toast_list.splice(index, 1);
	}
}
