<script lang="ts">
	import ToastContainer from "$lib/components/ui/ToastContainer.svelte";
    import  "$lib/style/app.scss";
    let { children } = $props()
</script>

<ToastContainer />
{@render children()}