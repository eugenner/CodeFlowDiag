<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
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
const emit = defineEmits(['cloneNodeAction', 'isEdit'])

const props = defineProps(['id', 'data'])

const md = markdownit({breaks: true, html: false});

let isToolbarVisible = ref(false);
let isResizerVisible = ref(false);
let isEdit = ref(false);
const textareaRef = ref(null);

const edit = function (event) {
  console.log('edit')
  isEdit.value = !isEdit.value;
  event.stopPropagation();
  event.preventDefault()
}
const resize = function(event) {
  isResizerVisible.value = !isResizerVisible.value;
  event.preventDefault()
}

const cloneBtnAction = () => {
  emit('cloneNodeAction');
}

const linkClicked = function() {
  console.log('linkClicked')
  vscode.postMessage({ command: 'linkClicked', link: props.data.link});
}

const nodeClicked = function() {
  if(isEdit.value || isResizerVisible.value) return;
  
  isToolbarVisible.value = !isToolbarVisible.value;
}

const deleteNode = () => {
  removeNodes(['' + props.id])
}

const blur = function(event) {
  // console.log('blur target: ' + event.target + ' current target: ' + event.currentTarget)
  if(event.relatedTarget?.parentElement == event.target) {
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

watch(isEdit, (newValue, oldValue) => {
  if (newValue) {
    adjustTextareaSize();
  }
  emit('isEdit', isEdit.value);
});

// vs code api intercommunication
const handleMessage = (event) => {
  if(event.data.nodeId != props.id)
    return;
  // Handle the received message
  console.log('Received message:', event.data);
  const message = event.data;
  const result = event.data.data;

  switch (message.command) {
      case 'listFiles':
          console.log('listFiles: ' + JSON.stringify(result));
          props.data.text.value += 'files: ' + JSON.stringify(result);
          break;
  }
};

  onMounted(() => {
    // Add event listener when component is mounted
    window.addEventListener('message', handleMessage);
  });

  onBeforeUnmount(() => {
    // Remove event listener when component is unmounted
    window.removeEventListener('message', handleMessage);
  });

</script>

<template>
  <div @blur="blur" tabindex="0" class="custom_node">
    <div>
      <FontAwesomeIcon class="tool-icon1" :icon="faEdit" @click="nodeClicked" />
      <FontAwesomeIcon class="tool-icon2" :icon="faFileText" v-if="props.data.link" @click="linkClicked" />
    </div>
    <NodeResizer min-width="100" min-height="30" color="blue" :isVisible="isResizerVisible" />
    <NodeToolbar :is-visible=isToolbarVisible :position="Position.Top">
      <button @mousedown="edit">edit</button>
      <button @mousedown="resize">resize</button>
      <button @mousedown="cloneBtnAction">clone</button>
      <button @mousedown="srcLinkBtnAction" v-if="!props.data.link">src link</button>
      <button @mousedown="srcUnlinkBtnAction" v-if="props.data.link">src unlink</button>
      <button @mousedown="deleteNode">delete</button>
      <label>({{ props.id }})</label>
    </NodeToolbar>
    <Handle type="target" :position="Position.Top" />
    <Handle type="source" :position="Position.Bottom" />
    <div v-show="!isEdit" v-html="md.render(data.text)"></div>
    <textarea class="ta nowheel nodrag" ref="textareaRef"
      @blur="blur" tabindex="1" v-show="isEdit" v-model="data.text" 
      :rows="1 + data.text.split('\n').length" />
  </div>
</template>

<style scope>
  li {
    text-align: left;
  }
  .tool-icon1:hover {
    cursor: pointer;
  }
  .tool-icon2:hover {
    cursor: pointer;
  }
  .custom_node {
    background-color: rgb(240, 208, 166);
    padding: 0;
    width: 100%;
    display: flex;
    min-height: 38px;
  }
  .ta {
    font-size: 0.5em;
    height: 100%;
    width: 100%;
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

</style>