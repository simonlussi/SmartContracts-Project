declare module 'mongoose' {
  namespace Schema {
    namespace Types {
      class EtherBigNumber extends SchemaType {}
      class EtherAddress extends SchemaType {}
    }
  }
}