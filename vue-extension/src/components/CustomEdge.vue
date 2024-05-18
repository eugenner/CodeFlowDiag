<script setup>
import { BaseEdge, EdgeLabelRenderer, getBezierPath, useVueFlow } from '@vue-flow/core'
import { computed, ref, watch } from 'vue';
import markdownit from 'markdown-it';

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
  data: {
    type: Object,
    required: false,
  },
  sourceX: {
    type: Number,
    required: true,
  },
  sourceY: {
    type: Number,
    required: true,
  },
  targetX: {
    type: Number,
    required: true,
  },
  targetY: {
    type: Number,
    required: true,
  },
  sourcePosition: {
    type: String,
    required: true,
  },
  targetPosition: {
    type: String,
    required: true,
  },
  markerEnd: {
    type: String,
    required: false,
  },
  style: {
    type: Object,
    required: false,
  },
  selected: {
    type: Boolean,
    required: false,
  },
})

const emit = defineEmits(['isEdgeEdit'])

const showMenu = ref(false);
const md = markdownit({breaks: true, html: false});
const { onEdgeClick } = useVueFlow()
const isEdit = ref(false);

const { removeEdges } = useVueFlow()

const path = computed(() => getBezierPath(props))


onEdgeClick((me) => {
  emit('isEdgeEdit', true); // TODO testing
  if (me.edge.id === props.id) {
    console.log('id: ' + props.id + ' is selected: ' + me.edge.selected);
    console.log('edge clicked: ' + me.edge.id + ' showMenu.value: ' + showMenu.value);
    // removeEdges([event.edge.id]);
    showMenu.value = !showMenu.value;
  }
})

const editLabel = () => {
  isEdit.value = !isEdit.value;
}

const blur = function(event) {
  console.log('blur');
  if(event.relatedTarget?.classList.contains('ta')) {
    return;
  }
  isEdit.value = false;
  showMenu.value = false;
}

watch(isEdit, () => {
  console.log('edge edit: ' + isEdit.value);
  emit('isEdgeEdit', isEdit.value);
});

</script>

<script>
export default {
  inheritAttrs: false,
}
</script>

<template>
  <BaseEdge :id="id" :style="style" :path="path[0]" :marker-end="markerEnd" />
  <EdgeLabelRenderer>
    <div :style="{
    pointerEvents: 'all',
    position: 'absolute',
    transform: `translate(10%, -50%) translate(${path[1]}px,${path[2]}px)`, }" class="nodrag nopan ">
      <div v-if="showMenu">
        <button class="edgebutton" @click="editLabel(id)" @blur="blur" tabindex="1">edit</button>
        <button class="edgebutton" @click="removeEdges(id)">×</button>
      </div>
      <textarea class="ta nowheel nodrag" v-if="isEdit" @blur="blur" tabindex="2" 
        v-model="data.text" />
      <div v-if="!isEdit" class="ta" style="background-color: white" v-html="md.render(data.text)"></div>
    </div>

  </EdgeLabelRenderer>
</template>



<style scoped>
.ta {
  font-size: 0.5em;
}

.edgebutton {
  font-size: 7px;
  padding-top: 1px;
  padding-bottom: 1px;
  padding-left: 3px;
  padding-right: 3px;
  border-radius: 1px;
  border-style: outset;
  border: 0.1px solid rgba(118, 118, 118, 0.502);
  outline: unset;
  box-shadow: 0 0 0 0px rgb(203, 26, 26);
}
</style>