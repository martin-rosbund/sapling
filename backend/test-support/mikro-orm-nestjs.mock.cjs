class MockMikroOrmModule {}

function createDynamicModule() {
  return {
    module: MockMikroOrmModule,
    providers: [],
    exports: [],
  };
}

module.exports = {
  MikroOrmModule: {
    forRoot: () => createDynamicModule(),
    forFeature: () => createDynamicModule(),
  },
};