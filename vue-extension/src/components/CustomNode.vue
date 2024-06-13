<script setup>
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue'
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { NodeToolbar } from '@vue-flow/node-toolbar'
import { NodeResizer } from '@vue-flow/node-resizer'
import markdownit from 'markdown-it'
import '@vue-flow/node-resizer/dist/style.css'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faEdit, faFileText } from '@fortawesome/free-regular-svg-icons';
import { useEventsBus } from './EventsBus.vue';
const { removeNodes, updateNode } = useVueFlow();

// const { emit } = useEventsBus();
const emit = defineEmits(['cloneNodeAction', 'isEdit']);

const props = defineProps(['id', 'data']);
const nodeShapes = ['default', 'ellipse', 'rhombus', 'hexagon', 'barrel'];
const currentNodeShape = ref(props.data.shapeType ? props.data.shapeType : 'default');

const md = markdownit({ breaks: true, html: false });

let isToolbarVisible = ref(false);
let isResizerVisible = ref(false);
let isEdit = ref(false);
const textareaRef = ref(null);
const currentNode = ref(null);


const edit = function (event) {
  console.log('edit')
  isEdit.value = !isEdit.value;
  event.stopPropagation();
  event.preventDefault()
}
const resize = function (event) {
  isResizerVisible.value = !isResizerVisible.value;
  event.preventDefault()
}

const cloneBtnAction = () => {
  emit('cloneNodeAction');
}

const linkClicked = function () {
  console.log('linkClicked')
  vscode.postMessage({ command: 'linkClicked', link: props.data.link });
}

const nodeClicked = function () {
  if (isEdit.value || isResizerVisible.value) return;
  isToolbarVisible.value = !isToolbarVisible.value;
}

const deleteNode = () => {
  removeNodes(['' + props.id])
}

const blurBgColorSelect = function (event) {
  console.log('blur bgColorSelect: ' + event.target.value);
  props.data.bgColor = event.target.value;
  if (props.data.shapeType == 'default') {
    currentNode.value.style.backgroundColor = event.target.value;
  }

  isEdit.value = false;
  isToolbarVisible.value = false;
  isResizerVisible.value = false;
}

const blur = function (event) {
  console.log('blur started');
  if (event.relatedTarget?.className == 'bg-color-select') {
    return;
  }

  if (event.relatedTarget?.className == 'node-shape') {
    return;
  }

  // console.log('blur target: ' + event.target + ' current target: ' + event.currentTarget)
  if (event.relatedTarget?.parentElement == event.target) {
    event.stopPropagation();
    return;
  };

  isEdit.value = false;
  isToolbarVisible.value = false;
  isResizerVisible.value = false;
}

const adjustTextareaSize = () => {
  if (textareaRef.value) {
    const parentHeight = textareaRef.value.parentNode.clientHeight;
    textareaRef.value.style.height = `${parentHeight}px`;
  }
};

const srcLinkBtnAction = () => {
  navigator.clipboard.readText().then(clp => {
    console.log('srcLinkBtnAction: ' + clp)
    props.data.link = clp;
    props.data.text.value += ' link: ' + clp;
  });
}

const srcUnlinkBtnAction = () => {
  props.data.link = '';
}

const shapeChangeBtnAction = (event) => {
  console.log('currentNodeShape: ' + currentNodeShape.value);
  props.data.shapeType = currentNodeShape.value;
  isEdit.value = false;
  isToolbarVisible.value = false;
  isResizerVisible.value = false;
}

const nodeBgStyle = computed(() => {
  if (props.data.shapeType != null && props.data.shapeType != 'default') {
    return { backgroundColor: 'transparent', border: 'none' }
  } else {
    return { backgroundColor: props.data.bgColor }
  }
});

watch(isEdit, (newValue, oldValue) => {
  if (newValue) {
    adjustTextareaSize();
  }
  emit('isEdit', isEdit.value);
});

onMounted(() => {
});

onBeforeUnmount(() => {
});

</script>

<template>

  <div @blur="blur" ref="currentNode" :style="nodeBgStyle" tabindex="0" class="custom_node vue-flow__node-default">
    <div>
      <FontAwesomeIcon class="tool-icon1" :icon="faEdit" @click="nodeClicked" />
      <FontAwesomeIcon class="tool-icon2" :icon="faFileText" v-if="props.data.link" @click="linkClicked" />
    </div>
    <NodeResizer min-width="100" min-height="30" color="blue" :isVisible="isResizerVisible" />
    <NodeToolbar :is-visible=isToolbarVisible :position="Position.Top">
      <select v-model="currentNodeShape" class="node-shape" @change="shapeChangeBtnAction">
        <option v-for="shape in nodeShapes" :key="shape" :value="shape" :selected="currentNodeShape == shape">
          {{ shape }}
        </option>
      </select>
      <button @mousedown="edit">edit</button>
      <button @mousedown="resize">resize</button>
      <button @mousedown="cloneBtnAction">clone</button>
      <button @mousedown="srcLinkBtnAction" v-if="!props.data.link">src link</button>
      <button @mousedown="srcUnlinkBtnAction" v-if="props.data.link">src unlink</button>
      <button @mousedown="deleteNode">delete</button>
      <input @blur="blurBgColorSelect" v-model="data.bgColor" type="color" class="bg-color-select"
        style="height: inherit; width: 20px;" />
    </NodeToolbar>

    <Handle id="top" type="target" :position="Position.Top" />
    <Handle id="left" type="target" :position="Position.Left" />
    <Handle id="botton" type="source" :position="Position.Bottom" />
    <Handle id="right" type="source" :position="Position.Right" />
    <div class="tr" v-show="!isEdit" v-html="md.render(data.text)"></div>
    <textarea class="ta nowheel nodrag" ref="textareaRef" @blur="blur" tabindex="1" v-show="isEdit" v-model="data.text"
      :rows="1 + data.text.split('\n').length" />
    <div class="svg-container" v-if="data.shapeType == 'ellipse'">
      <svg xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="50%" cy="50%" rx="50%" ry="50%" :fill="data.bgColor" stroke="black" stroke-width="1" />
      </svg>
    </div>
    <div class="svg-container" v-if="data.shapeType == 'rhombus'">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="50,0 100,50 50,100 0,50" :fill="data.bgColor" stroke="black" stroke-width="1"/>
        </svg>
    </div>
    <div class="svg-container" v-if="data.shapeType == 'hexagon'">
      <svg viewBox="10 10 80 80" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M 70,10 
                     L 90,50 
                     L 70,90 
                     L 30,90 
                     L 10,50 
                     L 30,10 
                     Z" :fill="data.bgColor" stroke="black" stroke-width="1" />
      </svg>
    </div>
    <div class="svg-container" v-if="data.shapeType == 'barrel'">
      <svg viewBox="340 300 1340 1400" preserveAspectRatio="none"  x="128" y="128" role="img" style="display:inline-block;vertical-align:middle"
        xmlns="http://www.w3.org/2000/svg">
        <path :fill="data.bgColor" stroke="currentColor" stroke-linecap="round" stroke-width="25"
          d="M355.105 530.563v938.874c42.996 208.638 1246.884 208.638 1289.88 0V530.563c-42.996-208.638-1246.884-208.638-1289.88 0c42.996 208.639 1246.884 208.639 1289.88 0M355.105 708.61c42.996 208.639 1246.884 208.639 1289.88 0M355.105 886.657c42.996 208.639 1246.884 208.639 1289.88 0" />
      </svg>
    </div>
  </div>
</template>

<style scope>
.tool-icon1:hover {
  cursor: pointer;
}

.tool-icon2:hover {
  cursor: pointer;
}

.custom_node {
  padding: 0;
  width: 100%;
  display: flex;
  min-height: 38px;
}

.tr {
  text-align: left;
}

.ta {
  height: 100%;
  width: 100%;
  font-size: smaller;
}

.tool-icon1 {
  position: absolute;
  right: 3px;
  top: 3px;
  color: rgb(113, 113, 231);
}

.tool-icon2 {
  position: absolute;
  right: 20px;
  top: 3px;
  color: rgb(106, 150, 99);
}

.vue-flow__node-toolbar {
  display: flex;
}

.node-shape {
  background-color: rgb(239, 239, 239);
}

.svg-container {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  width: 100%;
  height: 100%;
  z-index: -10;
  background-color: transparent;
}

.svg-container svg {
  width: 100%;
  height: 100%;
}
</style>