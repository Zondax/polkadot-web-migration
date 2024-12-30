import HTMLReactParser, {
  DOMNode,
  HTMLReactParserOptions,
  domToReact
} from 'html-react-parser';
import DOMPurify from 'isomorphic-dompurify';

const htmlToReactOptions: HTMLReactParserOptions = {
  replace: (domNode: DOMNode) => {
    if ('children' in domNode) {
      switch (domNode.name) {
        case 'ul': {
          return (
            <div className="flex flex-col space-y-1 mt-1">
              {domToReact(domNode.children as DOMNode[], htmlToReactOptions)}
            </div>
          );
        }
        case 'li': {
          return (
            <li>
              <div className="mb-6">
                <p className="text-sm text-gray-600">
                  <strong className="text-gray-800 font-medium text-sm">
                    {domToReact(
                      domNode.children as DOMNode[],
                      htmlToReactOptions
                    )}
                  </strong>
                </p>
              </div>
            </li>
          );
        }
        case 'h5': {
          return (
            <h6 className="font-bold text-lg mb-2">
              {domToReact(domNode.children as DOMNode[], htmlToReactOptions)}
            </h6>
          );
        }
        case 'a': {
          return (
            <a
              href={domNode.attribs.href}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600"
            >
              {domToReact(domNode.children as DOMNode[], htmlToReactOptions)}
            </a>
          );
        }
      }
    }
  }
};

export function muifyHtml(input: string) {
  const purified = DOMPurify.sanitize(input);
  const output = HTMLReactParser(purified, htmlToReactOptions);
  return output;
}
