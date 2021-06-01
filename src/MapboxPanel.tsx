import React, { useRef, useEffect, useState } from 'react';
import {PanelProps } from '@grafana/data';
import { SimpleOptions } from 'types';
import mapboxgl from 'mapbox-gl'
import {css} from 'emotion'
import './style.css';

interface Props extends PanelProps<SimpleOptions> { };
mapboxgl.accessToken = 'pk.eyJ1IjoieGlhb2thbmciLCJhIjoiY2poOHdxdHkzMDdwdDNkbzJmeTVsamdnaSJ9.BV_ZrgFql-TRM04mwa08sA';

export const MapboxPanel: React.FC<Props> = ({ options, data, width, height }) =>{
    const mapContainer = useRef<HTMLDivElement>(null);
    let map = useRef(null);
    const [lng, setLng] = useState(117);
    const [lat, setLat] = useState(37);
    const [zoom, setZoom] = useState(9);
    const mapStyle = css({
        width: width,
        height: height
    });
    useEffect(()=>{
        if(map.current) return;
        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/streets-v11',
            center: [lng, lat],
            zoom: zoom    
        })
    })
    useEffect(() => {
        if (!map.current) return; // wait for map to initialize
        // map.current.on('move', () => {
        //     setLng(map.current.getCenter().lng.toFixed(4));
        //     setLat(map.current.getCenter().lat.toFixed(4));
        //     setZoom(map.current.getZoom().toFixed(2));
        // });
        
    });
    useEffect(()=>{

        //更新图层
        if (!map.current) return;
        if (data.series.length<2)return
        const sourceID = 'landslide-data';
        const lineID = 'landslide-line';
        const labelID = 'landslide-label';
        const pointSourceId = 'landslide-point-data'
        const pointID = 'landslide-point';
        const pointLabelID = 'landslide-point-label';
        const bs_series = data.series[0];
        const bs_lat = bs_series.fields[1].state.calcs.mean;
        const bs_lon = bs_series.fields[2].state.calcs.mean;
        let features = [];
        let pointFeatures = []
        pointFeatures.push({
            'type': 'Feature',
            'properties': {
                'label':'基站'
            },
            'geometry': {
                'type': 'Point',
                'coordinates': [bs_lon,bs_lat]
            }
        })
        const typeKeys = "BCDEFGH"
        for (let i=1;i<data.series.length;i++){
            let series = data.series[i]
            let lat = series.fields.find(field => field.name === 'latitude').state.calcs.lastNotNull
            let lon = series.fields.find(field => field.name === 'longitude').state.calcs.lastNotNull
            let bl = series.fields.find(field => field.name === 'bl_length').state.calcs.lastNotNull.toFixed(4)
            features.push({
                'type': 'Feature',
                'properties': {
                    'label':bl+'m'
                },
                'geometry': {
                    'type': 'LineString',
                    'coordinates': [
                        [bs_lon,bs_lat],
                        [lon,lat]
                    ]
                }
            })
            pointFeatures.push({
                'type': 'Feature',
                'properties': {
                    'label':'辅站'+(typeKeys.indexOf(series.refId)+1)
                },
                'geometry': {
                    'type': 'Point',
                    'coordinates':[lon,lat]
                }
            })
        }
        let geojson = {
            'type': 'FeatureCollection',
            'features':features
        };
        let pointGeojson = {
            'type': 'FeatureCollection',
            'features':pointFeatures
        }
        if (map.current.getSource(sourceID)){
            map.current.getSource(sourceID).setData(geojson);
            map.current.getSource(pointSourceId).setData(pointGeojson);
            
            if (Math.abs(bs_lat-lat)>=0.1 || Math.abs(bs_lon-lng)>=0.1){
                let bounds =  new mapboxgl.LngLatBounds([bs_lon-0.01, bs_lat-0.01], [bs_lon+0.01, bs_lat+0.01]);
                setLat(bs_lat.toFixed(4));
                setLng(bs_lon.toFixed(4));
                map.current.fitBounds(bounds, {
                    padding: 20
                });
            }
        } else {
            map.current.on('load', ()=>{
                console.log('初始化加载')
                if (!map.current.getSource(sourceID)){
                    map.current.addSource(sourceID,{ 
                        type: 'geojson', 
                        data: geojson
                    });
                    map.current.addSource(pointSourceId,{ 
                        type: 'geojson', 
                        data: pointGeojson
                    });
                    
                    map.current.addLayer({
                        'id': lineID,
                        'type': 'line',
                        'source': sourceID,
                        "layout": {
                            "line-join": "round",
                            "line-cap": "round"
                        },
                        "paint": {
                            "line-color": "#888",
                            "line-width": 4
                        }
                    })
                    map.current.addLayer({
                        'id': labelID,
                        'type': 'symbol',
                        'source': sourceID,
                        'layout': {
                            "symbol-placement": "line-center",
                            'text-field':['get','label'],
                            "text-size": 12,
                            "text-offset":[0, 1.25],
                            "text-rotate": -4,
                            "symbol-spacing": 1,
                        }
                    });
                    map.current.addLayer({
                        'id': pointID,
                        'type': 'circle',
                        'source':pointSourceId ,
                        "paint":{
                            "circle-color":"#51bbd6",
                            'circle-radius':6
                        }
                    })
                    map.current.addLayer({
                        'id': pointLabelID,
                        'type': 'symbol',
                        'source': pointSourceId,
                        'layout': {
                            "symbol-placement": "point",
                            'text-field':['get','label'],
                            "text-size": 12,
                            "text-offset":[0, 1.25],
                            "text-rotate": -4,
                            "symbol-spacing": 1,
                        }
                    });
                }
                setLat(bs_lat.toFixed(4))
                setLng(bs_lon.toFixed(4))
                map.current.flyTo({
                    center: [bs_lon,bs_lat],
                    speed: 0.5
                });
            })
        }  
    })
    return (
        <div>
            <div className="sidebar">
            Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
            </div>
            <div ref={mapContainer} className={mapStyle} />
        </div>
    );
}
