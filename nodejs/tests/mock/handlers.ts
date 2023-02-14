import { rest } from 'msw'

export const handlers = [
  rest.get('/posts', (req, res, ctx) => {
    return res(
      ctx.json(null),
    )
  }),
]
