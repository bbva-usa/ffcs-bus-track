import React, {Component} from 'react';
import {render} from 'react-dom';
import MapGL, {Marker} from 'react-map-gl';
import ControlPanel from './control-panel';
import PolylineOverlay from './PolylineOverlay';

import busRoute from './1401_fairfield_high_school.json';

const MAPBOX_TOKEN = 'pk.eyJ1IjoiZmZjcy1idXMtdHJhY2siLCJhIjoiY2swZTBuZTY4MGJxcTNkcXhhcHd0b2ptZCJ9.PapNKyNrTFC8RRxFoltSRg'; // Set your mapbox token here

import MARKER_STYLE from './marker-style';

export default class App extends Component {
  state = {
    viewport: {
      latitude: 33.477702,
      longitude: -86.915183,
      zoom: 11,
      bearing: 0,
      pitch: 50
    },
    interactionState: {},
    settings: {
      dragPan: true,
      dragRotate: true,
      scrollZoom: true,
      touchZoom: true,
      touchRotate: true,
      keyboard: true,
      doubleClickZoom: true,
      minZoom: 0,
      maxZoom: 20,
      minPitch: 0,
      maxPitch: 85
    },
    route: []
  };

  componentDidMount() {
    let stops = busRoute.morning.sort((a,b) => a.time - b.time)
    console.log(stops)
    this._getRoute(stops)
  };

  _onViewportChange = viewport => this.setState({viewport});

  _onInteractionStateChange = interactionState => this.setState({interactionState});

  _onSettingChange = (name, value) =>
    this.setState({
      settings: {...this.state.settings, [name]: value}
    });

  _renderMarker(station, i) {
    const {location, latitude, longitude, time} = station;
    return (
      <Marker
        key={i}
        longitude={longitude}
        latitude={latitude}
        captureDrag={false}
        captureDoubleClick={false}
      >
        <div className="station">
          <span>{location + ' - ' + time}</span>
        </div>
      </Marker>
    );
  }

  _getRoute(stops) {
    let coordinates = stops.map(stop => stop.longitude + ',' + stop.latitude).join(';')
    let url = 'https://api.mapbox.com/directions/v5/mapbox/driving/' + coordinates + '?access_token=' + MAPBOX_TOKEN + '&geometries=geojson'

    fetch(url).then(res => res.json()).then(res => this.setState({route: res.routes[0].geometry.coordinates}))
  }

  render() {
    const {viewport, settings, interactionState, route} = this.state;

    return (
      <MapGL
        {...viewport}
        {...settings}
        width="100%"
        height="100%"
        mapStyle="mapbox://styles/mapbox/dark-v9"
        onViewportChange={this._onViewportChange}
        onInteractionStateChange={this._onInteractionStateChange}
        mapboxApiAccessToken={MAPBOX_TOKEN}
      >
        <style>{MARKER_STYLE}</style>
        <PolylineOverlay points={route}/>
        {busRoute.morning.map(this._renderMarker)}
        <ControlPanel
          containerComponent={this.props.containerComponent}
          settings={settings}
          interactionState={{...interactionState}}
          onChange={this._onSettingChange}
        />
      </MapGL>
    );
  }
}

export function renderToDom(container) {
  render(<App />, container);
}
