# Provenance and third-party notices

Reviewed for this reference export on 2026-10-15. The root MIT license applies to
the project's own contributions. It does not relicense outside datasets, media,
services or trademarks. Keep the notices below when redistributing this source.

## Included material

| Material | Origin | Applicable notice |
| --- | --- | --- |
| Project JavaScript, SQL, CSS, HTML and documentation, except the vendor files below | Worldline Atlas project, created with AI assistance under Ondřej Fiala's direction | [MIT, copyright 2026 Ondřej Fiala](LICENSE) |
| Procedural globe grid and inline schematic station icon | Original project code; no photographic texture or third-party logo | Project MIT license |
| Research demo and test fixtures | Invented examples created for this project; no real research or orbital dataset | Project MIT license; synthetic labels must remain clear |
| `frontend/vendor/satellite-6.0.1.js` | `satellite.js` version 6.0.1, published npm package, `dist/satellite.es.js` | [Retained upstream MIT license](frontend/vendor/satellite-6.0.1.LICENSE.md), copyright 2013 Shashwat Kandadai, UCSC Jack Baskin School of Engineering |

The vendored library is unmodified. Its SHA-256 is
`988753903b9390def631093eaec7e1143cc2c15d546f42c3cb1e3fc9badea90e`.
The source and license were compared with the package archive.
Upstream: [satellite.js 6.0.1](https://github.com/shashwatak/satellite-js/tree/6.0.1)
and [license at that tag](https://github.com/shashwatak/satellite-js/blob/6.0.1/LICENSE.md).
No npm installation is required by this demo. Node.js is a separately obtained
runtime and is not redistributed here. The UI uses system fonts; no font files
are bundled.

## NASA material — excluded

The original texture was matched byte-for-byte to NASA's
[land_ocean_ice_2048.jpg](https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57730/land_ocean_ice_2048.jpg):
266,599 bytes, SHA-256
`d4dc80a6ef571939d0abe04a9bed3d3d1e6cd63e59514be1c5e43a6b069e6f1e`.
That identifies the file's origin; an asset-specific credit/rights record was not
fully resolved for this release. The image is excluded and is not fetched.

[NASA's media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/)
generally allow factual educational and informational uses with acknowledgement
and without implied endorsement. They also identify exceptions for third-party
copyrighted material and restrictions concerning marks, people and promotional
uses. They do not make every asset MIT-licensed. Exclusion here is a limited
release decision, not a finding that NASA prohibits this project.

Experimental GIBS adapter source is retained, but no tiles or datasets are
included and the adapter is not mounted. Enabling a layer requires checking that
specific product's provenance, credit and current terms separately.

## CelesTrak material — excluded

No real orbital elements or CelesTrak responses are redistributed. The orbital
test fixture contains invented values and is explicitly labeled synthetic. Its
catalog identifiers exercise validation and do not establish a real ISS orbit.

[CelesTrak's GP documentation](https://celestrak.org/NORAD/documentation/gp-data-formats.php)
describes formats and service constraints, including limited fetch frequency,
only requesting needed data, checking errors and stopping queries for human
investigation after errors. This review did not establish a general MIT
redistribution grant for its data. The default demo makes no provider requests;
enabling the unmounted adapter needs a separate terms and operational review.

## Names and marks

NASA, CelesTrak, OpenAI, Dots and other names identify context or sources. No
third-party logos are bundled and no sponsorship or endorsement is claimed.
The project's MIT license grants no rights in those names or marks.
