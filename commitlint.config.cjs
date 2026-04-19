module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'agent',
        'render',
        'chat',
        'website',
        'cockpit',
        'release',
        'deps',
        'ci',
        'docs',
        'repo',
      ],
    ],
    'header-max-length': [2, 'always', 100],
  },
};
