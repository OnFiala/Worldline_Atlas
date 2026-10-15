# Imagery

The default globe renders an original procedural latitude/longitude grid. It has no continents or geographic basemap and loads no image or tile service. The UI labels it as schematic. Lighting and the inline ISS silhouette are illustrative original graphics, not third-party logos.

The retained frontend/imagery.js and worker/imagery.mjs implement a fixed NASA GIBS BlueMarble_ShadedRelief_Bathymetry adapter. Its documented matrix is CRS84, origin (-180,90), 512-pixel tiles, span 288 / 2^z degrees. Tests mock the provider and exercise bounds, projection, hidden-view cancellation and cache failures. The demo does not instantiate the imagery loader or mount the provider route.

A future integration must review the exact layer's provenance, credits and current service terms before activation. No imagery redistribution grant is inferred from the project's MIT license. See ../THIRD_PARTY_NOTICES.md for the source audit and omitted texture.
