# Install Kicbac SDKs

Prefer released packages when the registry contains them. Confirm availability
before changing a project manifest; never substitute an unrelated same-named
package.

The JavaScript fallback requires Git, Node.js 20.19 or newer, and npm. Invoke
the repository's pinned pnpm 9.15.4 version through `npx`; do not depend on an
unverified global pnpm shim.

## Pinned Python source fallback

Use the verified Python SDK commit when `pip install kicbac` is unavailable:

```sh
python -m pip install "kicbac @ git+https://github.com/00-Aakash-00/kicbac-python.git@8242b8711fcc2663d951702dce84311ae9420d9d#subdirectory=sdk-python"
```

## Pinned JavaScript source fallback

When npm packages are unavailable, clone and pin the verified monorepo, build
it, pack only the required packages, and install the tarballs together:

```sh
git clone https://github.com/00-Aakash-00/kicbac-js.git kicbac-js
git -C kicbac-js checkout dbbbf4c56317d7e1bf53a1a40bef7adf2605eb03
npx --yes pnpm@9.15.4 --dir kicbac-js install --frozen-lockfile
npx --yes pnpm@9.15.4 --dir kicbac-js build

mkdir -p kicbac-packs
npx --yes pnpm@9.15.4 --dir kicbac-js/packages/kicbac pack --pack-destination "$PWD/kicbac-packs"
npx --yes pnpm@9.15.4 --dir kicbac-js/packages/js pack --pack-destination "$PWD/kicbac-packs"
npx --yes pnpm@9.15.4 --dir kicbac-js/packages/react pack --pack-destination "$PWD/kicbac-packs"
npx --yes pnpm@9.15.4 --dir kicbac-js/packages/nextjs pack --pack-destination "$PWD/kicbac-packs"
npx --yes pnpm@9.15.4 --dir kicbac-js/packages/themes pack --pack-destination "$PWD/kicbac-packs"

npm install ./kicbac-packs/kicbac-0.1.0.tgz \
  ./kicbac-packs/kicbac-js-0.1.0.tgz \
  ./kicbac-packs/kicbac-react-0.1.0.tgz \
  ./kicbac-packs/kicbac-nextjs-0.1.0.tgz \
  ./kicbac-packs/kicbac-themes-0.1.0.tgz
```

Install only the tarballs the application needs, plus their Kicbac
dependencies. Record the pinned commit in the application so upgrades are
intentional. Replace this fallback with registry versions after publication.
