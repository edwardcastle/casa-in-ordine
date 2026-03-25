interface TestimonialCardProps {
  text: string;
  author: string;
  location: string;
}

export default function TestimonialCard({ text, author, location }: TestimonialCardProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-md border border-secondary/30">
      <div className="text-primary mb-3">
        <svg className="w-8 h-8 opacity-50" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609L9.978 5.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H0z" />
        </svg>
      </div>
      <p className="text-gray-600 italic leading-relaxed mb-4">&ldquo;{text}&rdquo;</p>
      <div>
        <p className="font-semibold text-gray-900">{author}</p>
        <p className="text-sm text-gray-500">{location}</p>
      </div>
    </div>
  );
}
