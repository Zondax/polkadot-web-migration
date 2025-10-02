import HTMLReactParser, { domToReact, type DOMNode, type HTMLReactParserOptions } from 'html-react-parser'

// The `isomorphic-dompurify` package relies on `jsdom` to work in the server-side rendering context of Next.js.
// However, `jsdom` is not available in the Next.js build/SSR contexts, which causes the error.
// To resolve this issue, we dynamically import `isomorphic-dompurify` only when the code is running in the client-side rendering context.
let DOMPurify: typeof import('isomorphic-dompurify').default
if (typeof window !== 'undefined') {
  DOMPurify = require('isomorphic-dompurify')
}

/**
 * Configuration options for HTML to React transformation
 */
const htmlToReactOptions: HTMLReactParserOptions = {
  replace: (domNode: DOMNode) => {
    if ('children' in domNode) {
      switch (domNode.name) {
        case 'ul': {
          return <div className="flex flex-col space-y-1 mt-1">{domToReact(domNode.children as DOMNode[], htmlToReactOptions)}</div>
        }
        case 'li': {
          return (
            <li>
              <div className="mb-6">
                <p className="text-sm text-gray-600">
                  <strong className="text-gray-800 font-medium text-sm">
                    {domToReact(domNode.children as DOMNode[], htmlToReactOptions)}
                  </strong>
                </p>
              </div>
            </li>
          )
        }
        case 'h5': {
          return <h6 className="font-bold text-lg mb-2">{domToReact(domNode.children as DOMNode[], htmlToReactOptions)}</h6>
        }
        case 'a': {
          return (
            <a href={domNode.attribs.href} target="_blank" rel="noreferrer" className="text-blue-600">
              {domToReact(domNode.children as DOMNode[], htmlToReactOptions)}
            </a>
          )
        }
      }
    }
  },
}

/**
 * Transforms and sanitizes HTML into React elements with Material UI styling
 * @param input The HTML string to transform
 * @returns The transformed React elements
 */
export function muifyHtml(input: string) {
  const purified = DOMPurify.sanitize(input)
  const output = HTMLReactParser(purified, htmlToReactOptions)
  return output
}
