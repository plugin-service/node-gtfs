module.exports = {
  filenameBase: 'calendar_dates',
  schema: [
    {
      name: 'id',
      type: 'integer',
      primary: true
    },
    {
      name: 'service_id',
      type: 'varchar(255)',
      required: true
    },
    {
      name: 'date',
      type: 'integer',
      required: true
    },
    {
      name: 'exception_type',
      type: 'integer',
      required: true,
      min: 1,
      max: 2
    },
    {
      name: 'holiday_name',
      type: 'varchar(255)'
    }
  ]
};
