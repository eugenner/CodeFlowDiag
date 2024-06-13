<script setup>
import { VueFlow, useVueFlow, Panel } from '@vue-flow/core';
import { Controls, ControlButton } from '@vue-flow/controls';
import { ref, onMounted, onBeforeUnmount } from 'vue';

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faFloppyDisk, faQuestionCircle, faXmarkCircle } from '@fortawesome/free-regular-svg-icons'
import { Background } from '@vue-flow/background'
import markdownit from 'markdown-it'
import { markRaw } from 'vue'

import CustomNode from './components/CustomNode.vue'
import CustomEdge from './components/CustomEdge.vue'

import { useEventsBus } from './components/EventsBus.vue';

import exampleData from './assets/cfd.json';

const { bus } = useEventsBus();
const md = markdownit({breaks: true, html: false});
const { addNodes, removeNodes, fromObject, findNode,
  updateEdge, addEdges, onPaneReady, toObject, snapToGrid, setNodes, setEdges, events } = useVueFlow();
snapToGrid.value = true;

// useVueFlow provides access to the event handlers
const {
  onEdgeClick,
  onEdgeDoubleClick,
  onEdgeContextMenu,
  onEdgeMouseEnter,
  onEdgeMouseLeave,
  onEdgeMouseMove,
  onConnectStart,
  onNodeClick,
  onSelectionStart,
  onSelectionEnd
} = useVueFlow()

let store = useVueFlow();
let metaData = {nextId: 11, fileName: ''};
let fileName = ref('cfd.json');
let clickStack = [1, 2];
const showSaveInfo = ref(false);
const showHelpInfo = ref(false);
let isNodeEditState = false;
let isEdgeEditState = false;
const defaultNodeStyle = {
  background: '#ef467e',
  color: 'white',
  borderRadius: '9px',
}
let vueFlowInstance;
const nodes = ref([]);
const edges = ref([]);

let mousePosition = { x: 0, y: 0 };
const nodeTypes = {
  custom: markRaw(CustomNode)
}

const edgeTypes = {
  custom: markRaw(CustomEdge)
}

function onConnect(params) {
  const newEdge = {
    id: + params.source + '-' + params.target,
    source: params.source,
    sourceHandle: params.sourceHandle,
    target: params.target,
    targetHandle: params.targetHandle,
    type: 'custom',
    data: { text: '' },
    updatable: true
  }
  addEdges([newEdge])
}

function onEdgeUpdate({ edge, connection }) {
  updateEdge(edge, connection)
}

onPaneReady((instance) => {
  vueFlowInstance = instance;
  instance.fitView()
});

onNodeClick((event, node) => {
  console.log('node clicked', node)
})

onSelectionStart(() => {
  console.log('onSelectionStart')
})
onSelectionEnd(() => {
  console.log('onSelectionEnd')
})

function onAddNode(nodeToClone) {
  const nId = String(metaData.nextId++);

  if(nodeToClone) {
    addNodes({
      id: nId,
      type: 'custom',
      position: { x: nodeToClone.position.x + 120, y: nodeToClone.position.y - 40 },
      data: { shapeType: nodeToClone.data.shapeType, text: nodeToClone.data.text, bgColor: nodeToClone.data.bgColor }
    })
  } else {
    addNodes({
      id: nId,
      type: 'custom',
      position: vueFlowInstance.project({ x: mousePosition.x, y: mousePosition.y }),
      data: { shapeType: 'default', text: '', bgColor: '' }
    })
  }

}

function onRemoveNode() {
  console.log('try to remove node')
  removeNodes(['1'])
}

const onDeleteNode = () => {
  console.log('try to onDeleteNode')
  removeNodes(['1'])
}

// double click imitation 300ms
const onDblClick = (e) => {
  clickStack.push(performance.now());
  clickStack.shift();
  if (clickStack[1] - clickStack[0] < 300) {
    console.log('double click happens: ' + e.pageX + ' : ' + e.pageY);
    if(!isNodeEditState && !isEdgeEditState) {
      onAddNode();
    }
  }
}

const saveDiag = () => {
  let diagData = toObject();
  metaData.fileName = fileName.value;
  let allData = JSON.stringify({diagData: diagData, metaData: metaData});
  vscode.postMessage({ command: 'saveDiag', data: allData });
  showSaveInfo.value = false;
}

function handleKeyDown(event) {
  if (event.key === ' ') {
    // onAddNode();
  }
}

function handleMouseMove(event) {
  mousePosition.x = event.clientX;
  mousePosition.y = event.clientY;
}

const nodeEditStateAction = (val) => {
  console.log('nodeEditStateAction: ' + val)
  isNodeEditState = val;
}

const edgeEditStateAction = (val) => {
  console.log('edgeEditStateAction: ' + val)
  isEdgeEditState = val;
}

const cloneNodeAction = (val) => {
  console.log('cloneNodeAction: ' + val)
  onAddNode(findNode(val));
}
// TODO is not used, may be later
/*
watchEffect(() => {
  // Check if the event data exists in the bus
  if (bus.value.has('delete')) {
    // Set the eventData variable to the event data stored in the bus
    console.log('bus has arrived')
    let nodeId = bus.value.get('delete')[0];
    removeNodes(nodeId);
  }
});
*/
// vs code api intercommunication
const handleMessage = (event) => {
  // Handle the received message
  console.log('Received message:', event.data);
  const message = event.data;
  const result = event.data.data;

  switch (message.command) {
      case 'loadDiag':
        // $reset();
        console.log('loadDiag: ' + JSON.stringify(result));
        let json = JSON.parse(result);
        console.log('loaded file name: ' + event.data.fileName)
        fileName.value = event.data.fileName;
        metaData = json.metaData;
        fromObject(json.diagData);
        // setNodes(json.diagData.nodes);
        // setEdges(json.diagData.edges);
        break;
  }
};

const showInfo = () => {
  showHelpInfo.value = !showHelpInfo.value;
}

const helpText = `
Help
* Double-click to create a new node.
* Click node's edit icon to:
  * Choose the shape.
  * Edit:
    * MarkDown content syntax.
  * Resize.
  * Clone.
  * Src link:
    * Open source file, select lines, press right button and choose "Copy source path (code flow diag)".
    * After, click the "src link" button to connect the Node with the source file.
    * Src unlink - to delete connection between node and source.
  * Delete.
  * Change the node's background color.
* Save data:
  * Click the save icon.
  * Choose the file name to save; the path is relative to the current project.
* Load data:
  * CFD LIST panel:
    * Click the Refresh icon to update the file list.
    * Edit button to open the saved Diagram.
`;

onBeforeUnmount(() => {
  window.removeEventListener('message', handleMessage);
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('keydown', handleKeyDown);
});

onMounted(() => {
  window.addEventListener('message', handleMessage);
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('keydown', handleKeyDown);
  fromObject(exampleData['diagData']);
  /* 
  nodes.value.push(
    {
      id: '1',
      type: 'custom',
      data: { shapeType: 'default', text: 'one', bgColor: '#a1a4f7' },
      position: { x: 100, y: 100 },
      class: 'nopan draggable selectable'
    },
    {
      id: '2',
      type: 'custom',
      data: { shapeType: 'default', text: 'two', bgColor: '#dfb3b3' },
      position: { x: 25, y: 200 },
      class: 'nopan draggable selectable'
    },
    {
      id: '3',
      type: 'custom',
      data: { shapeType: 'ellipse', text: 'three', bgColor: '#dfb3b3' },
      position: { x: 200, y: 200 },
      class: 'nopan draggable selectable'
    }
  );


  edges.value.push(
    {
      id: '1-2',
      source: '1',
      sourceHandle: 'bottom',
      target: '2',
      targetHandle: 'top',
      updatable: true,
      type: 'custom',
      data: { text: '1-2' },
    },
    {
      id: '1-3',
      source: '1',
      sourceHandle: 'bottom',
      target: '3',
      targetHandle: 'top',
      updatable: true,
      type: 'custom',
      data: { text: '1-3' },
    }
  );
*/


});
</script>

<template>
  <!-- <div style="width: 800px; height: 600px; border-style: dashed;"> -->
  <div class="layout-flow">

    <VueFlow :nodes="nodes" :edges="edges" :node-types="nodeTypes" :edge-types="edgeTypes" 
      @pane-ready="onPaneReady" @edge-update="onEdgeUpdate" 
      @connect="onConnect" @click="onDblClick"  
      :zoom-on-double-click="false">

      <template #node-custom="nodeProps">
        <CustomNode v-bind="nodeProps"
          @cloneNodeAction="cloneNodeAction(nodeProps.id)"
          @isEdit="nodeEditStateAction" />
      </template>

      <template #edge-custom="edgeProps">
        <CustomEdge v-bind="edgeProps" 
          @isEdgeEdit="edgeEditStateAction" />
      </template>
      <Background />
      <Controls position="top-right">
        <ControlButton @mousedown="showSaveInfo = !showSaveInfo">
          <FontAwesomeIcon :icon="faFloppyDisk" />
        </ControlButton>
        <ControlButton @click="showInfo">
          <FontAwesomeIcon :icon="faQuestionCircle" />
        </ControlButton>
      </Controls>
      <Panel v-if="showSaveInfo || showHelpInfo" class="process-panel" position="top-left">
        <div class="layout-panel">
          <div v-if="showSaveInfo" style="padding-right: 8px;">
            <span>File name: </span>
            <button @click="showSaveInfo = false" class="help-close-btn">
              <FontAwesomeIcon :icon="faXmarkCircle" />
            </button>
            <input type="text" v-model="fileName" @keyup.enter="saveDiag" />
            <button class="save-btn" @click="saveDiag">Save</button>
          </div>
          <div v-if="showHelpInfo">
            <div v-html="md.render(helpText)"></div> 
            <button @click="showInfo" class="help-close-btn">
              <FontAwesomeIcon :icon="faXmarkCircle" />
            </button>
          </div>
        </div>
      </Panel>
    </VueFlow>

  </div>
</template>

<style>
/* import the required styles */
@import "@vue-flow/core/dist/style.css";

/* import the default theme (optional) */
@import "@vue-flow/core/dist/theme-default.css";

@import '@vue-flow/controls/dist/style.css';

html,
body,
#app {
  margin: 0;
  height: 100%;
}

.layout-flow {
  height: 100%;
  width: 100%;
}

.vue-flow__node-default {
  padding: 0;
  display: flex;
  width: 100%;
  height: 100%;
}

.vue-flow__background {
  background-color: azure
}


.process-panel,
.layout-panel {
  display: flex;
  gap: 010px;
}

.help-close-btn {
  position: absolute;
  top: 0px;
  right: 9px;
  background-color: inherit;
  border: inherit;
  width: 10px;
}

.help-close-btn:hover {
    cursor: pointer;
}

.save-btn {
  background-color: inherit;
  border-color: #f4050561;
  border-radius: 10px;
  margin-left: 4px;
}

.save-btn:hover {
    cursor: pointer;
}

.process-panel {
  background-color: #fbfabe;
  padding: 10px;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
}

.process-panel label {
  color: rgb(21, 3, 59);
  font-size: 12px;
}
</style>