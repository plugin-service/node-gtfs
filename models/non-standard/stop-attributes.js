module.exports = {
  filenameBase: 'stop_attributes',
  schema: [
    {
      name: 'id',
      type: 'integer',
      primary: true
    },
    {
      name: 'stop_id',
      type: 'varchar(255)',
      required: true
    },
    {
      name: 'stop_city',
      type: 'varchar(255)'
    }
  ]
};
