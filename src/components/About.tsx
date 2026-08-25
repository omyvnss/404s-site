export function About() {
  return (
    <section className="about-page container-page" aria-labelledby="about-heading">
      <h1 id="about-heading" className="about-heading">
        About This Gallery
      </h1>

      <div className="about-content">
        <p className="about-paragraph">
          Every website has a 404 page. Most of them are forgettable — a generic message,
          a redirect to the homepage, or nothing at all. But some teams treat that dead end
          as a chance to do something unexpected.
        </p>

        <p className="about-paragraph">
          This gallery collects the ones worth finding. The pages that make you pause,
          smile, or wonder how they built that. A tiny game. A weird animation. A joke
          hidden in the console. Proof that someone cared about even the broken paths.
        </p>

        <p className="about-paragraph">
          We're not trying to catalog every 404 on the internet. Just the ones that feel
          intentional — where the error page becomes a deliberate design decision rather
          than an afterthought.
        </p>

        <p className="about-paragraph">
          If you run into one that belongs here, the link in the navigation goes nowhere
          right now. But the archive modal (the filter icon in the toolbar) lists every
          site in the collection with dates.
        </p>
      </div>
    </section>
  )
}