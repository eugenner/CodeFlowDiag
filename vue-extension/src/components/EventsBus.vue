<script>
import { ref } from "vue";
const bus = ref(new Map());

export function useEventsBus() {

    function emit(event, ...args) {
        console.log('but got an event')
        bus.value.set(event, args);
    }

    return {
        emit,
        bus
    }
}
</script>