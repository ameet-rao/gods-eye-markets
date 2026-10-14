// Simplified major sea lanes, hand-placed waypoints [lon, lat]. Visual context only.
export const LANES = [
  { name: 'Asia-Europe via Suez', main: true, pts: [[122.1,30.6],[121.5,26],[119.6,23.6],[116,21],[111,14],[106,6],[104.2,1.3],[101.5,2.6],[98.5,5.5],[94,6.2],[80.5,5.7],[66,10.5],[52,12.4],[45,12.2],[43.4,12.6],[41.5,15],[38.2,20.5],[35,26],[33.6,27.8],[32.5,29.8],[32.35,31.3],[28,33.6],[20,35],[12,37.2],[5,37.6],[-5.6,35.95],[-9.6,37.5],[-9.8,43],[-6,48.2],[-2,49.8],[1.5,50.8],[4.1,51.95]] },
  { name: 'Transpacific', main: true, pts: [[122.4,30.8],[130,31.5],[141,35],[160,40],[180,43]], cont: [[-180,43],[-160,42],[-140,39],[-125,35],[-118.3,33.7]] },
  { name: 'Panama & US East Coast', main: true, pts: [[-118.3,33.7],[-112,24],[-104,17],[-93,13],[-84,7],[-79.6,8.6],[-79.9,9.4],[-78,11.5],[-75.5,16],[-74.2,20],[-72,25],[-75,32],[-74,40.4]] },
  { name: 'Gulf crude to Asia', main: true, pts: [[50.2,26.6],[53,26.8],[56.3,26.5],[58.5,23.5],[62,20],[72,10],[80.5,5.7]] },
  { name: 'Black Sea grain', main: false, pts: [[37.8,44.7],[33,43.6],[29.05,41.1],[26.4,40.2],[25,37.5],[24,35.5],[20,35]] },
  { name: 'Cape of Good Hope diversion', main: false, pts: [[80.5,5.7],[70,-5],[52,-22],[35,-33],[18.4,-35.2],[10,-25],[0,-8],[-14,8],[-20,22],[-14,33],[-9.6,37.5]] },
  { name: 'US Gulf exports', main: false, pts: [[-93.9,29.7],[-90,26.5],[-84,24],[-80.5,24.5],[-79,27],[-70,32],[-45,40],[-20,45.5],[-6,48.2]] },
];

export function lanesGeoJSON() {
  return {
    type: 'FeatureCollection',
    features: LANES.map((l) => ({
      type: 'Feature',
      properties: { name: l.name, main: l.main },
      geometry: l.cont ? { type: 'MultiLineString', coordinates: [l.pts, l.cont] } : { type: 'LineString', coordinates: l.pts },
    })),
  };
}
