# OpenAPI Workflow

Treat `kicbac-js/openapi/scripts/build-openapi.mjs` as the canonical source and
`kicbac-js/openapi/kicbac.openapi.json` as generated output. Do not hand-edit a
generated or mirrored copy.

For an API-contract change:

1. Verify the field or workflow against current Kicbac documentation.
2. Edit the generator and relevant canonical fixtures in `kicbac-js/openapi/`.
3. Run `node openapi/scripts/build-openapi.mjs` from `kicbac-js`.
4. Run the JavaScript SDK OpenAPI tests and confirm the generated file has no
   unexplained diff.
5. Copy the canonical `openapi/` artifacts into `kicbac-python`; copy the
   documented subset into `kicbac-docs`. Their CI diff gates must pass exactly.
6. Update SDK types, tests, docs, and skill examples in the same release window.

Keep public schema descriptions Kicbac-only. Never expose credentials, raw
payment data, or underlying-provider branding in generated artifacts.
