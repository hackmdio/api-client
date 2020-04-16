export function defaults (defaultObject: any, ...mergeObjects: any[]) {
  return mergeObjects.reduce((acc, cur) => {
    return Object.entries(cur).reduce((accc, [key, value]) => {
      if (typeof accc[key] === 'undefined') {
        return {
          ...accc,
          [key]: value
        }
      } else {
        return accc
      }
    }, {...acc})
  }, {...defaultObject})
}
