const getQuery = (value) => ({ $in: Array.isArray(value) ? value : [value] });

const getFilterQuery = (query) => {
  let query_obj = {};
  if (query.brands) {
    query_obj["brand.brand_name"] = getQuery(query.brands);
  }
  if (query.make) {
    query_obj["fitments.make"] = getQuery(query.make);
  }
  if (query.model) {
    query_obj["fitments.model"] = getQuery(query.model);
  }
  if (query.engine) {
    query_obj["fitments.engine"] = getQuery(query.engine);
  }
  return query_obj;
};

export default getFilterQuery;
