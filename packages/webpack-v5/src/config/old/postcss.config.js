module.exports = {
  ident: 'postcss',
  syntax: 'postcss-scss' /*install "postcss-scss" for SCSS style */,
  map: false /*its depends on your choice*/,
  plugins: {
    'postcss-flexbugs-fixes': {},
    autoprefixer: {
      flexbox: 'no-2009',
    },
  },
}
