<script setup>
import { VueFlow, useVueFlow, BaseEdge, EdgeLabelRenderer } from '@vue-flow/core';
import { Controls, ControlButton } from '@vue-flow/controls';
import { ref, watch, watchEffect, inject, onMounted, onBeforeUnmount } from 'vue';

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faFloppyDisk, faQuestionCircle } from '@fortawesome/free-regular-svg-icons'
import { Background } from '@vue-flow/background'

import { markRaw } from 'vue'
import CustomNode from './components/CustomNode.vue'
import EdgeWithButton from './components/EdgeWithButton.vue'

import { useEventsBus } from './components/EventsBus.vue';


const { bus } = useEventsBus();

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
let metaData = {nextId: 10, fileName: ''};
let fileName = ref('cfd.json');
let clickStack = [1, 2];
let showSaveInfo = ref(false);
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
  button: markRaw(EdgeWithButton)
}

function onConnect(params) {
  const newEdge = {
    id: + params.source + '-' + params.target,
    target: params.target,
    source: params.source,
    type: 'button',
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
      class: 'custom_node vue-flow__node vue-flow__node-default nopan draggable selectable',
      position: { x: nodeToClone.position.x + 120, y: nodeToClone.position.y - 40 },
      data: { text: nodeToClone.data.text }
    })
  } else {
    addNodes({
      id: nId,
      type: 'custom',
      class: 'custom_node vue-flow__node vue-flow__node-default nopan draggable selectable',
      position: vueFlowInstance.project({ x: mousePosition.x, y: mousePosition.y }),
      data: { text: '' }
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
    onAddNode();
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
        // fromObject(json.diagData);
        setNodes(json.diagData.nodes)
        setEdges(json.diagData.edges)
        break;
  }
};

onBeforeUnmount(() => {
  window.removeEventListener('message', handleMessage);
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('keydown', handleKeyDown);
});

onMounted(() => {
  window.addEventListener('message', handleMessage);
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('keydown', handleKeyDown);

  nodes.value.push(
    {
      id: '1',
      type: 'custom',
      data: { text: 'one' },
      position: { x: 100, y: 100 },
      class: 'vue-flow__node-default nopan draggable selectable'
    },
    {
      id: '2',
      type: 'custom',
      data: { text: 'two' },
      position: { x: 25, y: 200 },
      class: 'vue-flow__node-default nopan draggable selectable'
    },
    {
      id: '3',
      type: 'custom',
      data: { text: 'three' },
      position: { x: 200, y: 200 },
      class: 'vue-flow__node-default nopan draggable selectable'
    }
  );


  edges.value.push(
    {
      id: '1-2',
      target: '2',
      source: '1',
      updatable: true,
      type: 'button',
      data: { text: '1' },
    },
    {
      id: '1-3',
      target: '3',
      source: '1',
      updatable: true,
      type: 'button',
      data: { text: '2' },
    }
  );



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
        <CustomNode :id="nodeProps.id" :data="nodeProps.data" @cloneNodeAction="cloneNodeAction(nodeProps.id)"/>
      </template>
      <Background />
      <Controls position="top-right">
        <ControlButton @mousedown="showSaveInfo = true">
          <FontAwesomeIcon :icon="faFloppyDisk" />
        </ControlButton>
        <ControlButton @click="showInfo">
          <FontAwesomeIcon :icon="faQuestionCircle" />
        </ControlButton>
      </Controls>
    </VueFlow>
    <div v-if="showSaveInfo" style="position: absolute; top: 10px;">
      fileName: <input type="text" v-model="fileName" @keyup.enter="saveDiag"/>
    </div>
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
}

.vue-flow__background {
  background-color: azure
}
</style>