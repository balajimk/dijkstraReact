import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import './index.css';

// Vertex component
class Vertex extends Component {
    selectVertex(e, vertex) {
        this.props.onVertexClick(vertex);
    }

    getClassByProperties() {
        var className = 'vertex '
        if (this.props.isSourceVertex) {
            className = className + ' sourceV';
        }
        if (this.props.isStartVertex) {
            className = className + ' startV';
        }
        if (this.props.isTargetVertex) {
            className = className + ' targetV';
        }
        if (this.props.inPath) {
            className = className + ' pathV';
        }
        return className;
    }

    render() {
        const vPosition = {
            left: this.props.cx - 30,
            top: this.props.cy - 30,
        }

        return (
            <div
                id={'v' + this.props.id}
                className={this.getClassByProperties()}
                style={vPosition}
                onClick={(e) => this.selectVertex(e, this)}
            >{this.props.label}</div >
        )
    }
}

class Edge extends Component {
    selectEdge(e, edge) {
        this.props.onEdgeClick(edge);
    }

    getClassByProperties() {
        var className = 'edge '
        if (this.props.isSourceEdge) {
            className = className + ' sourceE';
        }
        if (this.props.inPath) {
            className = className + ' pathE';
        }
        return className;
    }

    render() {
        return (
            <line
                id={'e' + this.props.id}
                className={this.getClassByProperties()}
                x1={this.props.x1}
                y1={this.props.y1}
                x2={this.props.x2}
                y2={this.props.y2}
                distance={this.props.distance}
                onClick={(e) => this.selectEdge(e, this)
                }
            >
            </line>
        )
    }
}

class DistanceText extends Component {
    render() {
        return (
            <text
                id={this.props.id}
                x={(this.props.x1 + this.props.x2) / 2}
                y={(this.props.y1 + this.props.y2) / 2}
            >
                {this.props.distance}
            </text>
        )
    }
}

class Graph extends Component {
    constructor(props) {
        super(props);
        this.edgeInput = React.createRef();
        this.state = {
            verticesCreated: 0,
            edgesCreated: 0,
            vertices: [],
            edges: [],
            sourceVertex: null,
            sourceEdge: null,
            isDrawingInProgress: false,
            lastSelectedObject: null,
            stickySourceVertexOnConnect: false,
            selectAnotherVertexOnDelete: false,
            selectedEdgeValue: 0,
            startVertex: null,
            targetVertex: null,
        };

        this.onVertexClick = this.onVertexClick.bind(this);
        this.onEdgeClick = this.onEdgeClick.bind(this);
        this.handleInputChange = this.handleInputChange.bind(this);
        this.selectStartVertex = this.selectStartVertex.bind(this);
        this.selectTargetVertex = this.selectTargetVertex.bind(this);
        this.startCalculating = this.startCalculating.bind(this);
        this.resetPath = this.resetPath.bind(this);
        this.deleteSelected = this.deleteSelected.bind(this);
        this.delete = this.delete.bind(this);
    }

    onEdgeClick(edge) {
        if (this.state.sourceEdge === null || this.state.sourceEdge.id !== edge.props.id) {
            this.setState({
                lastSelectedObject: 'Edge',
                sourceEdge: edge.props,
                sourceVertex: null,
                selectedEdgeValue: edge.props.distance
            });
            this.edgeInput.current.focus();
        } else {
            this.setState({
                lastSelectedObject: null,
                sourceEdge: null,
                sourceVertex: null,
                selectedEdgeValue: 0
            });
        }
    }

    onVertexClick(vertex) {
        if (this.state.sourceVertex === null) {
            //picking the first source
            this.setState({ sourceVertex: vertex.props, isDrawingInProgress: true, lastSelectedObject: 'Vertex', sourceEdge: null });
        } else {
            if (this.state.sourceVertex.id === vertex.props.id) {
                //clicking the same node
                this.setState({ sourceVertex: null, isDrawingInProgress: false, lastSelectedObject: null, sourceEdge: null });
            } else {
                // connect here
                this.addEdge(this.state.sourceVertex, vertex.props);
            }
        }
    }

    doesEdgeExistBetweenVertices(v1, v2) {
        return this.state.edges.find(e => (e.vfrom === v1 && e.vto === v2) || (e.vfrom === v2 && e.vto === v1)) != null;
    }

    addEdge(fVertex, tVertex) {
        var currentVertex = this.state.stickySourceVertexOnConnect ? fVertex : tVertex;
        if (!this.doesEdgeExistBetweenVertices(fVertex.id, tVertex.id)) {
            // Add the new edge.
            this.setState({
                    sourceVertex: currentVertex,
                    lastSelectedObject: 'Vertex',
                    sourceEdge: null,
                    isDrawingInProgress: true,
                    edges: [...this.state.edges, {
                        id: this.state.edgesCreated + 1,
                        vfrom: fVertex.id,
                        vto: tVertex.id,
                        distance: 1,
                        used: false,
                        inPath: false,
                    }],
                    edgesCreated: this.state.edgesCreated + 1,
                    isSolutionFound: false,
                }
            )
            // Add each other as connecting vertices information.
            var vertices = this.state.vertices;
            var fconnects = vertices.find(v => v.id === fVertex.id).connects;
            if (fconnects.length === 0 || fconnects.find(fc => fc.vertexId === tVertex.id) === undefined) {
                vertices.find(v => v.id === fVertex.id).connects = [...fconnects, { vertexId: tVertex.id, label: tVertex.label, distance: 0 }];
            }

            var tconnects = vertices.find(v => v.id === tVertex.id).connects;
            if (tconnects.length === 0 || tconnects.find(tc => tc.vertexId === fVertex.id) === undefined) {
                vertices.find(v => v.id === tVertex.id).connects = [...tconnects, { vertexId: fVertex.id, label: fVertex.label, distance: 0 }];
            }
            this.setState({ vertices: vertices });

        } else {
            this.setState({ sourceVertex: tVertex, isDrawingInProgress: true, lastSelectedObject: 'Vertex' });
        }
    }

    //Thanks to RobG for this code at https://stackoverflow.com/questions/45787459/convert-number-to-alphabet-string-javascript/45787487
    getLabel(value) {
        var label = '', lastChar;
        while (value > 0) {
            lastChar = (value - 1) % 26;
            label = String.fromCharCode(65 + lastChar) + label;
            value = (value - lastChar) / 26 | 0;
        }
        return label || undefined;
    }

    addVertex(cx, cy, sx, sy) {
        this.setState({
            vertices: [...this.state.vertices, {
                id: this.state.verticesCreated + 1,
                label: this.getLabel(this.state.verticesCreated + 1),
                cx: cx,
                cy: cy,
                sx: sx,
                sy: sy,
                connects: Array(0).fill(null),
                previousVertexId: null,
                nextVertexId: null,
                calculatedDistance: 0,
                visited: false,
                inPath: false,
            }],
            verticesCreated: this.state.verticesCreated + 1,
        });
    }

    onKeyUp(e) {
        if (e.key === 'Delete') {
            this.delete();
        }
    }

    deleteSelected() {
        this.delete();
    }

    delete() {
        if (this.state.lastSelectedObject === 'Vertex') {
            this.deleteVertexWithEdges();
        } else if (this.state.lastSelectedObject === 'Edge') {
            this.deleteEdge();
        }
    }

    deleteVertexWithEdges() {
        if (this.state.sourceVertex !== null) {
            var vertexId = this.state.sourceVertex.id;
            var vertices = this.state.vertices.filter(v => v.id !== vertexId);
            if (vertices.length === 0) {
                this.setState({ edgesCreated: 0, verticesCreated: 0 });
            }
            var edges = this.state.edges.filter(e => e.vfrom !== vertexId && e.vto !== vertexId);
            var newSourceVertex = null, newLastSelectedObject = null;
            if (this.state.selectAnotherVertexOnDelete && vertices.length > 0) {
                //The commented code below picks the vertex from start
                //newSourceVertex = this.state.vertices.find(v => v.id !== vertexId);
                //Pick the last inserted vextex
                newSourceVertex = vertices[vertices.length - 1];
                newLastSelectedObject = newSourceVertex ? 'Vertex' : null;
            }
            this.setState({ vertices: vertices, edges: edges, sourceVertex: newSourceVertex, lastSelectedObject: newLastSelectedObject, sourceEdge: null });
        }
    }

    deleteEdge() {
        // Delete the connects from the vertices connected by this edge.
        var edge = this.state.edges.find(e => e.id === this.state.sourceEdge.id);
        var vfrom = edge.vfrom;
        var vto = edge.vto;

        var vertices = this.state.vertices;
        var fconnects = vertices.find(v => v.id === vfrom).connects;
        vertices.find(v => v.id === vfrom).connects = [...fconnects.filter(fc => fc.vertexId !== vto)];
        var tconnects = vertices.find(v => v.id === vto).connects;
        vertices.find(v => v.id === vto).connects = [...tconnects.filter(tc => tc.vertexId !== vfrom)];

        // safely remove the edge.
        var edges = this.state.edges.filter(e => e.id !== this.state.sourceEdge.id);

        // save
        this.setState({ vertices: vertices, edges: edges, lastSelectedObject: null, sourceEdge: null });
    }

    handleInputChange(event) {
        const target = event.target;
        const value = target.type === 'checkbox' ? target.checked : target.value;
        const name = target.name;

        if (name === 'selectedEdgeValue' && this.state.sourceEdge && this.state.lastSelectedObject === 'Edge') {
            var edges = this.state.edges;
            var index = edges.findIndex(e => e.id === this.state.sourceEdge.id);
            edges[index].distance = parseInt(value);
            this.setState({ edges: edges, [name]: value });
        } else {
            this.setState({
                [name]: value
            });
        }
    }

    selectStartVertex() {
        this.setState({ startVertex: this.state.sourceVertex, sourceVertex: null });
    }

    selectTargetVertex() {
        this.setState({ targetVertex: this.state.sourceVertex, sourceVertex: null });
    }

    resetPath() {
        var vertices = this.state.vertices;
        var edges = this.state.edges;

        vertices.forEach(v => {
            v.previousVertexId = null;
            v.nextVertexId = null;
            v.calculatedDistance = 0;
            v.visited = false;
            v.inPath = false;
        });

        edges.forEach(e => {
            e.used = false;
            e.inPath = false;
        });

        this.setState({
            vertices: vertices,
            edges: edges,
            sourceVertex: null,
            sourceEdge: null,
            isDrawingInProgress: false,
            lastSelectedObject: null,
            stickySourceVertexOnConnect: false,
            selectAnotherVertexOnDelete: false,
            selectedEdgeValue: 0,
            // startVertex: null,
            // targetVertex: null,
        });
    }

    startCalculating() {
        if (this.state.startVertex === null || this.state.targetVertex === null) {
            alert('Start vertex or target vertex not selected to calculate the path');
            return;
        }

        var vertices = this.state.vertices;
        var edges = this.state.edges;
        var unvisitedVerticesCount = vertices.filter(v => v.visited === false).length;
        var currentVertex = null;
        while (unvisitedVerticesCount > 0) {
            if (currentVertex == null) {
                currentVertex = vertices.find(v => v.id === this.state.startVertex.id);
            } else {
                var unvisited = vertices.filter(v => v.calculatedDistance > 0 && v.visited === false);
                currentVertex = unvisited.reduce((min, v) => v.calculatedDistance < min.calculatedDistance ? v : min, unvisited[0]);
            }

            if (currentVertex === undefined) {
                break;
            } else {
                var connectingEdges = edges.filter(e => (e.vfrom === currentVertex.id || e.vto === currentVertex.id) && e.used === false);
                connectingEdges.forEach(currentEdge => {
                    var currentNeighborId = 0;
                    if (currentEdge.vfrom === currentVertex.id){
                        currentNeighborId = currentEdge.vto;
                    } else {
                        currentNeighborId = currentEdge.vfrom;
                    }
                    var currentNeighbor = vertices.find(v => v.id === currentNeighborId);

                    var tempDistance = 0;
                    tempDistance = currentVertex.calculatedDistance + currentEdge.distance;
                    if (currentNeighbor.calculatedDistance === 0 || tempDistance < currentNeighbor.calculatedDistance) {
                        currentNeighbor.calculatedDistance = tempDistance;
                        currentNeighbor.previousVertexId = currentVertex.id;
                    }
                    currentEdge.used = true;
                })
            }
            currentVertex.visited = true;
            unvisitedVerticesCount = vertices.filter(v => v.visited === false).length;
        }

        // set next values for forward traversing
        var isSolutionFound = false;
        var nVertex = vertices.find(v => v.id === this.state.targetVertex.id);
        var valueToSetAsNext = '';
        while (true) {
            valueToSetAsNext = nVertex.id;
            if (nVertex.previousVertexId == null) {
                break;
            }
            nVertex = vertices.find(v => v.id === nVertex.previousVertexId);
            nVertex.nextVertexId = valueToSetAsNext;
            if (nVertex.id === this.state.startVertex.id) {
                isSolutionFound = true;
            }
        }

        if (isSolutionFound === true) {
            // set all the edges and nodes' inPath flag so that we can render differently
            currentVertex = vertices.find(v => v.id === this.state.startVertex.id);
            while (true) {
                currentVertex.inPath = true;
                if (currentVertex.nextVertexId === null || currentVertex.nextVertexId === 0) {
                    break;
                }
                var nextVertexId = currentVertex.nextVertexId;
                edges.find(e => (e.vfrom === currentVertex.id && e.vto === nextVertexId) || (e.vto === currentVertex.id && e.vfrom === nextVertexId)).inPath = true;
                currentVertex = vertices.find(v => v.id === nextVertexId);
            }
        }

        this.setState({ vertices: vertices });
        this.setState({ edges: edges });
        this.setState({ isSolutionFound: isSolutionFound });
    }

    render() {
        const graphContentElement = (
            <div
                className='container'
                tabIndex='0'
                onKeyUp={(e) => this.onKeyUp(e)}
                onDoubleClick={(e) => this.addVertex(e.clientX, e.clientY, e.screenX, e.screenY)}
            >
                {this.state.vertices.map(vertex => (
                    <Vertex
                        key={'v' + vertex.id}
                        id={vertex.id}
                        cx={vertex.cx}
                        cy={vertex.cy}
                        sx={vertex.sx}
                        sy={vertex.sy}
                        label={vertex.label}
                        inPath={vertex.inPath}
                        calculatedDistance={vertex.calculatedDistance}
                        onVertexClick={this.onVertexClick}
                        isSourceVertex={this.state.sourceVertex && this.state.sourceVertex.id === vertex.id}
                        isStartVertex={this.state.startVertex && this.state.startVertex.id === vertex.id}
                        isTargetVertex={this.state.targetVertex && this.state.targetVertex.id === vertex.id}
                    />
                ))}
                <svg>
                    {this.state.edges.map(edge => (
                        <React.Fragment key={'f' + edge.id}>
                            <Edge
                                key={'e' + edge.id}
                                id={edge.id}
                                isSourceEdge={this.state.sourceEdge && this.state.sourceEdge.id === edge.id}
                                x1={this.state.vertices.find(v => v.id === edge.vfrom).cx}
                                y1={this.state.vertices.find(v => v.id === edge.vfrom).cy}
                                x2={this.state.vertices.find(v => v.id === edge.vto).cx}
                                y2={this.state.vertices.find(v => v.id === edge.vto).cy}
                                distance={edge.distance}
                                inPath={edge.inPath}
                                onEdgeClick={this.onEdgeClick}
                            />
                            <DistanceText
                                key={'t' + edge.id}
                                id={edge.id}
                                x1={this.state.vertices.find(v => v.id === edge.vfrom).cx}
                                y1={this.state.vertices.find(v => v.id === edge.vfrom).cy}
                                x2={this.state.vertices.find(v => v.id === edge.vto).cx}
                                y2={this.state.vertices.find(v => v.id === edge.vto).cy}
                                distance={edge.distance}
                            />
                        </React.Fragment>
                    ), this)}
                </svg>
                <div className="controls">
                    <div>
                        <input
                            name="stickySourceVertexOnConnect"
                            type="checkbox"
                            checked={this.state.stickySourceVertexOnConnect}
                            onChange={this.handleInputChange} /> Keep source vertex selected on connect
                    </div>
                    <div>
                        <input
                            name="selectAnotherVertexOnDelete"
                            type="checkbox"
                            checked={this.state.selectAnotherVertexOnDelete}
                            onChange={this.handleInputChange} /> Select another vertex on delete
                    </div>
                    <div>
                        Edge Weight: <input
                            name="selectedEdgeValue"
                            type="text"
                            value={this.state.selectedEdgeValue}
                            onChange={this.handleInputChange}
                            ref={this.edgeInput} />
                    </div>
                    <div className="buttons">
                        <div onClick={this.deleteSelected} className="button">Delete</div>
                        <div onClick={this.selectStartVertex} className="button">Select Start</div>
                        <div onClick={this.selectTargetVertex} className="button">Select Target</div>
                        <div onClick={this.startCalculating} className="button">Calculate</div>
                        <div onClick={this.resetPath} className="button">Reset Path</div>
                    </div>
                </div>
            </div >
        );
        return (graphContentElement);
    };
}

const graphElement = <Graph></Graph>;
ReactDOM.render(
    graphElement,
    document.getElementById('root')
);
